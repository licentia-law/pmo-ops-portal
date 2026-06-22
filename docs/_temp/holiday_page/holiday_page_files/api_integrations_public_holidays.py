from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Protocol
from urllib.parse import urlencode
from urllib.request import urlopen
import json

from app.enums import HolidayType


class PublicHolidayProviderError(RuntimeError):
    pass


@dataclass(slots=True)
class ExternalHolidayRecord:
    holiday_date: date
    name: str
    holiday_type: HolidayType
    source_external_id: str
    source_year: int


class PublicHolidayProvider(Protocol):
    provider_name: str

    def fetch_year(self, year: int) -> list[ExternalHolidayRecord]:
        ...


class KrPublicHolidayApiAdapter:
    provider_name = "kr_public_data"

    def __init__(
        self,
        *,
        service_key: str,
        base_url: str,
        timeout_seconds: int = 15,
    ) -> None:
        self._service_key = service_key.strip()
        self._base_url = base_url
        self._timeout_seconds = timeout_seconds

    def fetch_year(self, year: int) -> list[ExternalHolidayRecord]:
        if not self._service_key:
            raise PublicHolidayProviderError("PUBLIC_HOLIDAY_API_SERVICE_KEY가 설정되지 않았습니다.")

        items: list[dict[str, object]] = []
        for month in range(1, 13):
            query = urlencode(
                {
                    "serviceKey": self._service_key,
                    "solYear": year,
                    "solMonth": f"{month:02d}",
                    "_type": "json",
                    "numOfRows": 100,
                }
            )
            url = f"{self._base_url}?{query}"
            try:
                with urlopen(url, timeout=self._timeout_seconds) as response:
                    payload = json.loads(response.read().decode("utf-8"))
            except Exception as error:  # pragma: no cover - network path exercised outside unit tests
                raise PublicHolidayProviderError(f"공휴일 API 호출 실패: {error}") from error
            items.extend(_extract_items(payload))

        rows: list[ExternalHolidayRecord] = []
        for item in items:
            record = _parse_item(item, year)
            if record is not None:
                rows.append(record)
        return rows


def _extract_items(payload: dict[str, object]) -> list[dict[str, object]]:
    response = payload.get("response")
    if not isinstance(response, dict):
        return []
    body = response.get("body")
    if not isinstance(body, dict):
        return []
    items = body.get("items")
    if not isinstance(items, dict):
        return []
    raw = items.get("item")
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    if isinstance(raw, dict):
        return [raw]
    return []


def _parse_item(item: dict[str, object], year: int) -> ExternalHolidayRecord | None:
    is_holiday = str(item.get("isHoliday", "")).upper()
    if is_holiday != "Y":
        return None

    date_kind = str(item.get("dateKind", "")).strip()
    if date_kind in {"01", "02"}:
        holiday_type = HolidayType.PUBLIC
    else:
        return None

    locdate_raw = str(item.get("locdate", "")).strip()
    date_name = str(item.get("dateName", "")).strip()
    seq = str(item.get("seq", "")).strip() or "1"
    if len(locdate_raw) != 8 or not locdate_raw.isdigit() or not date_name:
        return None

    return ExternalHolidayRecord(
        holiday_date=date.fromisoformat(f"{locdate_raw[:4]}-{locdate_raw[4:6]}-{locdate_raw[6:]}"),
        name=date_name,
        holiday_type=holiday_type,
        source_external_id=f"{locdate_raw}:{seq}",
        source_year=year,
    )

"""Cake pricing rules, as defined by the booking prototype (docs/prototype)."""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

# Base price of a 10" tier, in Kwacha, per flavour group.
FLAVOUR_PRICE = {"classic": 1300, "signature": 1400, "fruit": 2000, "vegan_diabetic": 1700}
SIZE_MULTIPLIER = {
    8: Decimal("0.80"),
    10: Decimal("1.00"),
    12: Decimal("1.20"),
    14: Decimal("1.44"),
    16: Decimal("1.73"),
}
ADDON_PRICE = {"edible_print": 100, "gloss_print": 75, "message_topper": 100}
DELIVERY_FEE = 150
MAX_TIERS = 3
RUSH_WINDOW = timedelta(hours=48)
RUSH_RATE = Decimal("0.20")  # applied to the cake subtotal only
DEPOSIT_RATE = Decimal("0.50")


@dataclass(frozen=True)
class Quote:
    cake: int
    rush_fee: int
    addons: int
    delivery: int
    total: int
    deposit: int


def _kwacha(amount: Decimal) -> int:
    return int(amount.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def is_rush(event_date: date, now: datetime) -> bool:
    return datetime.combine(event_date, time.min) - now < RUSH_WINDOW


def quote(
    flavour_group: str,
    tier_sizes: list[int],
    addons: set[str],
    delivery: bool,
    event_date: date,
    now: datetime,
) -> Quote:
    if not 1 <= len(tier_sizes) <= MAX_TIERS:
        raise ValueError(f"a cake needs 1-{MAX_TIERS} tiers")
    if event_date <= now.date():
        raise ValueError("event date must be in the future")
    cake = FLAVOUR_PRICE[flavour_group] * sum(SIZE_MULTIPLIER[s] for s in tier_sizes)
    rush = cake * RUSH_RATE if is_rush(event_date, now) else Decimal(0)
    addon_total = sum(ADDON_PRICE[a] for a in addons)
    delivery_fee = DELIVERY_FEE if delivery else 0
    total = cake + rush + addon_total + delivery_fee
    return Quote(
        cake=_kwacha(cake),
        rush_fee=_kwacha(rush),
        addons=addon_total,
        delivery=delivery_fee,
        total=_kwacha(total),
        deposit=_kwacha(total * DEPOSIT_RATE),
    )

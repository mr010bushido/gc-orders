from datetime import date, datetime

import pytest

from gc_orders.pricing import quote

NOW = datetime(2026, 9, 14, 12, 0)
LATER = date(2026, 9, 22)


def test_single_tier_pickup():
    q = quote("classic", [8], set(), delivery=False, event_date=LATER, now=NOW)
    assert (q.cake, q.total, q.deposit) == (1040, 1040, 520)


def test_multi_tier_addons_delivery():
    q = quote("signature", [8, 10], {"gloss_print"}, delivery=True, event_date=LATER, now=NOW)
    assert q.cake == 2520  # 1400 * (0.8 + 1.0)
    assert q.total == 2520 + 75 + 150
    assert q.rush_fee == 0


def test_rush_fee_applies_to_cake_only():
    q = quote(
        "fruit", [10], {"message_topper"}, delivery=True, event_date=date(2026, 9, 16), now=NOW
    )  # 36h away
    assert q.rush_fee == 400
    assert q.total == 2000 + 400 + 100 + 150
    assert q.deposit == 1325


@pytest.mark.parametrize("tiers", [[], [8, 10, 12, 14]])
def test_tier_count_limits(tiers):
    with pytest.raises(ValueError):
        quote("classic", tiers, set(), delivery=False, event_date=LATER, now=NOW)


def test_rejects_past_or_today():
    with pytest.raises(ValueError):
        quote("classic", [10], set(), delivery=False, event_date=NOW.date(), now=NOW)

#!/usr/bin/env python3
"""Verify free model calculations against FINMECH-UPGRADED Excel sample data."""
from __future__ import annotations

TOL = 0.01


def close(a: float, b: float) -> bool:
    return abs(a - b) <= TOL


def section(title: str) -> None:
    print(f"\n{'=' * 60}\n{title}\n{'=' * 60}")


# ── Revenue ──
section("Revenue Model")
price, customers, units_per, freq, lifetime = 3000, 10, 2, 4, 12
mpr = freq / 12
mus = customers * units_per
mrev = mus * price
arev = mrev * 12
exp = dict(monthlyPurchaseRate=mpr, monthlyUnitsSold=20, monthlyRevenue=60000, annualRevenue=720000)
got = dict(monthlyPurchaseRate=mpr, monthlyUnitsSold=mus, monthlyRevenue=round(mrev), annualRevenue=round(arev))
mm = [k for k in exp if not close(got[k], exp[k])]
print("Expected:", exp)
print("Got:", got)
print("✓ match" if not mm else f"MISMATCH: {mm}")

# ── Costing ──
section("Costing Model")
fixed = 45000 + 25000 + 10000 + 5000 + 1000 + 1500
var_unit = 2000 + 20 + 50 + 100 + 25 + 100
units = 20
var_total = var_unit * units
total = fixed + var_total
exp = dict(totalFixedCosts=87500, totalVariableCostPerUnit=2295, totalVariableCost=45900, totalMonthlyCost=133400)
got = dict(
    totalFixedCosts=round(fixed),
    totalVariableCostPerUnit=round(var_unit * 100) / 100,
    totalVariableCost=round(var_total),
    totalMonthlyCost=round(total),
)
mm = [k for k in exp if not close(got[k], exp[k])]
print("Expected:", exp)
print("Got:", got)
print("✓ match" if not mm else f"MISMATCH: {mm}")

# ── Break-even ──
section("Break-Even Model (Free)")
price, var_u, fixed_m = 3000, 2295, 87500
contrib = price - var_u
be_units = fixed_m / contrib
be_rev = be_units * price
proj = [
    (10, 30000, 110450),
    (20, 60000, 133400),
    (50, 150000, 202250),
]
print(f"BE units: {be_units} (Excel B8)")
print(f"BE revenue: {be_rev} (Excel B9)")
print(f"Contribution: {contrib} (Excel B7)")
for u, rev, cost in proj:
    g = u * price
    h = fixed_m + u * var_u
    ok = close(g, rev) and close(h, cost)
    print(f"  units={u}: revenue {g} vs {rev}, cost {h} vs {cost} -> {'✓' if ok else 'FAIL'}")

# App had used ceil -> wrong
wrong_be = -(-fixed_m // contrib)  # ceil
print(f"\nOld app (Math.ceil) BE units: {wrong_be} — WRONG vs Excel {be_units:.4f}")

# ── Checklist ──
section("Know Your Business Numbers")
responses = [
    "Partial", "Yes", "Yes", "Yes",
    "No", "No", "Partial",
    "Partial", "Yes", "No",
    "No", "Yes", "No",
    "Partial", "No", "Yes",
    "No", "No", "Yes",
    "No", "Yes", "Yes",
    "Partial", "No", "No",
]
weights = [3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
score_map = {"Yes": 2, "Partial": 1, "No": 0}
total = sum(score_map[r] * w for r, w in zip(responses, weights))
max_p = sum(w * 2 for w in weights)
pct = total / max_p * 100
status = "FINANCE-READY" if pct >= 80 else "GROWTH RISK" if pct >= 50 else "SURVIVAL RISK"
print(f"Total score: {total} (Excel I2=52 is stale D4; formulas give {total})")
print(f"Max: {max_p}, Readiness %: {pct:.4f}")
print(f"Status: {status} (Excel I5 with I2=52: SURVIVAL RISK)")

advisory = {
    2: "Strong control in place",
    1: "Needs improvement ; partially addressed",
    0: "High risk - immediate action required",
}
print("Advisory strings:", advisory)

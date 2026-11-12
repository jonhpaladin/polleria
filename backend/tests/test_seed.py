import json
from datetime import datetime
from pathlib import Path

import pytest

from app.seed import load_seed

SEED_PATH = Path(__file__).resolve().parents[1] / "app" / "seeds" / "catalog.json"


def test_seed_has_enough_categories_and_products() -> None:
    seed = load_seed()

    assert len(seed.categories) >= 5
    assert len(seed.products) >= 20


def test_seed_is_coherent() -> None:
    seed = load_seed()
    category_ids = {category.id for category in seed.categories}
    product_ids: set[str] = set()
    skus: set[str] = set()

    for product in seed.products:
        assert product.category_id in category_ids
        assert product.id not in product_ids, f"id duplicado: {product.id}"
        assert product.sku not in skus, f"sku duplicado: {product.sku}"
        assert sum(price.is_default for price in product.prices) == 1
        product_ids.add(product.id)
        skus.add(product.sku)


def test_seed_includes_updated_at_in_utc() -> None:
    seed = load_seed()

    assert seed.updated_at.tzinfo is not None
    assert seed.updated_at.utcoffset() is not None
    assert seed.updated_at.utcoffset().total_seconds() == 0


def test_seed_is_valid_and_reproducible_json() -> None:
    raw = json.loads(SEED_PATH.read_text(encoding="utf-8"))

    assert raw["updated_at"] == "2026-11-11T18:04:00Z"
    assert datetime.fromisoformat(raw["updated_at"].replace("Z", "+00:00")).year == 2026


def test_seed_rejects_price_with_three_decimals(tmp_path: Path) -> None:
    raw = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    raw["products"][0]["prices"][0]["price"] = "185.123"
    broken = tmp_path / "catalog.json"
    broken.write_text(json.dumps(raw), encoding="utf-8")

    with pytest.raises(ValueError):
        load_seed(broken)

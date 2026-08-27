from pathlib import Path
import json


ROOT = Path(__file__).resolve().parent.parent

SOURCE_FILE = ROOT / "data" / "coins-source.json"


def clean(value):
    if value is None:
        return ""
    return str(value).strip()


def normalize_status(coin):
    status = clean(coin.get("status")).lower()

    if status in {"collection", "missing", "duplicate"}:
        return status.capitalize()

    if coin.get("duplicates", 0):
        return "Duplicate"

    if coin.get("inCollection") is False:
        return "Missing"

    return "Collection"


def image_file_from_path(image_path):
    image_path = clean(image_path)

    if not image_path:
        return ""

    return Path(image_path).name


def main():
    if not SOURCE_FILE.exists():
        raise FileNotFoundError(
            f"Source file not found: {SOURCE_FILE}"
        )

    with SOURCE_FILE.open(
        "r",
        encoding="utf-8"
    ) as file:
        old_coins = json.load(file)

    new_coins = []

    for index, coin in enumerate(
        old_coins,
        start=1
    ):
        coin_id = clean(coin.get("id"))

        if not coin_id:
            coin_id = f"{index:03d}"

        status = normalize_status(coin)

        image_file = clean(
            coin.get("imageFile")
        )

        if not image_file:
            image_file = image_file_from_path(
                coin.get("image")
            )

        new_coin = {
            "id": coin_id,
            "country": clean(
                coin.get("country")
            ),
            "year": coin.get("year"),
            "denomination": clean(
                coin.get("denomination")
            ),
            "type": clean(
                coin.get("type")
            ),
            "name": clean(
                coin.get("name")
            ),
            "condition": clean(
                coin.get("condition")
            ),
            "status": status,
            "mintage": clean(
                coin.get("mintage")
            ),
            "description": clean(
                coin.get("description")
            ),
            "notes": clean(
                coin.get("notes")
            ),
            "imageFile": image_file
        }

        new_coins.append(new_coin)

    with SOURCE_FILE.open(
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            new_coins,
            file,
            ensure_ascii=False,
            indent=2
        )
        file.write("\n")

    print(
        f"Prepared {len(new_coins)} coins"
    )
    print(
        f"Updated: "
        f"{SOURCE_FILE.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()

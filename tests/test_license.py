import json


def test_license_status_not_activated(client, monkeypatch, tmp_path):
    catalog = tmp_path / "serial-keys.json"
    catalog.write_text(json.dumps({"keys": []}), encoding="utf-8")
    monkeypatch.setenv("VFT_STUDIO_LICENSE_FILE", str(catalog))

    r = client.get("/api/license/status")

    assert r.status_code == 200
    assert r.json()["activated"] is False


def test_license_activation_accepts_local_serial(client, monkeypatch, tmp_path):
    from backend.services.licensing import serial_hash

    key = "VFT-ABCD-2345-EFGH-6789"
    catalog = tmp_path / "serial-keys.json"
    catalog.write_text(json.dumps({"keys": [{"sha256": serial_hash(key)}]}), encoding="utf-8")
    monkeypatch.setenv("VFT_STUDIO_LICENSE_FILE", str(catalog))

    r = client.post("/api/license/activate", json={"serial_key": key})

    assert r.status_code == 200
    assert r.json()["activated"] is True
    assert r.json()["key_preview"] == "VFT-ABCD...6789"


def test_license_activation_rejects_unknown_serial(client, monkeypatch, tmp_path):
    catalog = tmp_path / "serial-keys.json"
    catalog.write_text(json.dumps({"keys": [{"sha256": "0" * 64}]}), encoding="utf-8")
    monkeypatch.setenv("VFT_STUDIO_LICENSE_FILE", str(catalog))

    r = client.post("/api/license/activate", json={"serial_key": "VFT-ABCD-2345-EFGH-6789"})

    assert r.status_code == 422

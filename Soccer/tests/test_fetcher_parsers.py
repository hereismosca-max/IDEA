from soccer_predictor.fetcher import _parse_triplet


def test_parse_triplet():
    a, b, c = _parse_triplet("1.02;0/0.5;0.88")
    assert a == 1.02
    assert b == "0/0.5"
    assert c == 0.88

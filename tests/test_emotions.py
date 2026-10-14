import numpy as np

from app.emotions import split_emotions, to_model_texts
from app.engine import Engine

POEM = """[contemplative] Un doux murmure traverse la nuit,
je reste éveillé et je pense à toi sans bruit.
[tender] Ta présence me manque, chaque seconde avec toi
est une lueur d'espoir qui brille en moi.
[sad] Parfois la peur me prend, la peur de te perdre,
quand les ombres du monde viennent tout détruire.
[joyful] Mais le matin se lève et efface mes larmes !
On rit ensemble, la tristesse s'enfuit,
car notre (((amour))) illumine la nuit !"""


def test_no_tag_is_one_neutral_part():
    assert split_emotions("Hallo Welt.") == [(None, "Hallo Welt.")]


def test_leading_tag():
    assert split_emotions("[sad] Es regnet.") == [("sad", "Es regnet.")]


def test_text_before_first_tag_stays_neutral():
    assert split_emotions("Anfang. [joyful] Dann Freude.") == [(None, "Anfang."), ("joyful", "Dann Freude.")]


def test_poem_switches_four_times_in_order():
    parts = split_emotions(POEM)
    assert [e for e, _ in parts] == ["contemplative", "tender", "sad", "joyful"]
    assert "(((amour)))" in parts[3][1]  # emphasis stays inside its section
    assert parts[1][1].startswith("Ta présence")


def test_empty_sections_and_consecutive_tags():
    assert split_emotions("[sad] [angry] Jetzt wirklich.") == [("angry", "Jetzt wirklich.")]
    assert split_emotions("[sad] [angry]") == []


def test_same_emotion_neighbours_are_merged():
    assert split_emotions("[sad] Eins. [sad] Zwei.") == [("sad", "Eins. Zwei.")]


def test_case_insensitive_and_unknown_brackets_untouched():
    assert split_emotions("[SAD] Ja [3] siehe Kapitel.") == [("sad", "Ja [3] siehe Kapitel.")]


def test_model_texts_get_their_own_leading_tag():
    assert to_model_texts(split_emotions("Intro. [sad] Leise. [angry] Laut!")) == ["Intro.", "[sad] Leise.", "[angry] Laut!"]


def test_join_segments_adds_gap():
    sr = 24000
    a = (0.3 * np.sin(2 * np.pi * 200 * np.arange(sr) / sr)).astype(np.float32)
    out = Engine.join_segments([a, a, a], sr, 0.3)
    assert len(out) > 3 * sr * 0.9 + 2 * int(0.3 * sr) * 0.9  # three pieces plus two gaps (edge silence is trimmed)
    assert np.isfinite(out).all()

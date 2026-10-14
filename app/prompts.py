"""Reading texts for clean reference recordings (about 20-25 s each, varied in sounds and tone).

`title`/`tone` are German, `title_en`/`tone_en` English (UI language); `text` is in the language of the reading text.
"""

PROMPTS = {
    "en": [
        {
            "id": "en-story",
            "title": "Der Leuchtturm", "title_en": "The lighthouse",
            "tone": "erzählend", "tone_en": "narrative",
            "text": (
                "The old lighthouse stood at the edge of the cliff, and every evening, just before sunset, "
                "Maria climbed its narrow stairs. \"Do you ever get tired of this view?\" her brother asked. "
                "She smiled. \"Never. Each night the sea tells a different story, some quiet, some wild, "
                "and some so beautiful that I forget to breathe.\""
            ),
        },
        {
            "id": "en-lively",
            "title": "Das Rezept", "title_en": "The recipe",
            "tone": "lebendig", "tone_en": "lively",
            "text": (
                "Wait, you actually found it? That's incredible! I've been searching for that recipe for twelve years. "
                "Okay, okay, let me think. We need two cups of flour, a pinch of salt, and, honestly, a little bit of luck. "
                "Quick, preheat the oven to three hundred and fifty degrees, and please, don't forget the butter this time."
            ),
        },
        {
            "id": "en-calm",
            "title": "Ruhige Erklärung", "title_en": "Calm explanation",
            "tone": "ruhig", "tone_en": "calm",
            "text": (
                "Good recordings start with a quiet room. Close the window, turn off the fan, and sit about "
                "a hand's width away from the microphone. Speak at the pace you would use with a friend: "
                "not too fast, not too slow, with natural pauses between the sentences."
            ),
        },
    ],
    "de": [
        {
            "id": "de-story",
            "title": "Das alte Haus", "title_en": "The old house",
            "tone": "erzählend", "tone_en": "narrative",
            "text": (
                "Am Rand der Stadt, wo die Straße in einen schmalen Feldweg übergeht, steht ein altes Haus "
                "mit grünen Fensterläden. Jeden Morgen öffnet Clara die Tür, atmet tief durch und lauscht den Vögeln. "
                "„Weißt du, was ich am meisten mag?“, fragt sie. „Dass jeder Tag völlig anders beginnt, "
                "und sich trotzdem wie zu Hause anfühlt.“"
            ),
        },
        {
            "id": "de-lively",
            "title": "Der Kuchen", "title_en": "The cake",
            "tone": "lebendig", "tone_en": "lively",
            "text": (
                "Das ist ja unglaublich! Du hast es tatsächlich geschafft? Ich hätte nie gedacht, dass es so schnell geht. "
                "Zuerst zwei Tassen Mehl, dann eine Prise Salz, und, ganz ehrlich, ein bisschen Glück schadet auch nicht. "
                "Schnell, heiz den Ofen auf hundertachtzig Grad vor, und vergiss diesmal bitte die Butter nicht."
            ),
        },
        {
            "id": "de-calm",
            "title": "Ruhige Erklärung", "title_en": "Calm explanation",
            "tone": "ruhig", "tone_en": "calm",
            "text": (
                "Gute Aufnahmen beginnen in einem ruhigen Raum. Schließe das Fenster, schalte den Lüfter aus "
                "und setze dich etwa eine Handbreit vom Mikrofon entfernt hin. Sprich so, wie du mit einem Freund "
                "sprechen würdest: nicht zu schnell, nicht zu langsam, mit natürlichen Pausen zwischen den Sätzen."
            ),
        },
    ],
}


def _extra(code: str, titles: tuple[str, str], story: str, lively: str) -> None:
    """Two reading texts (narrative, lively) for one more language."""
    PROMPTS[code] = [
        {"id": f"{code}-story", "title": titles[0], "title_en": "The lighthouse", "tone": "erzählend", "tone_en": "narrative", "text": story},
        {"id": f"{code}-lively", "title": titles[1], "title_en": "The recipe", "tone": "lebendig", "tone_en": "lively", "text": lively},
    ]


_T = ("Der Leuchtturm", "Das Rezept")

_extra("fr", _T,
       "Le vieux phare se dressait au bord de la falaise, et chaque soir, juste avant le coucher du soleil, Marie gravissait ses escaliers étroits. "
       "« Tu ne te lasses jamais de cette vue ? » demanda son frère. Elle sourit. "
       "« Jamais. Chaque nuit, la mer raconte une histoire différente, tantôt calme, tantôt sauvage, parfois si belle que j'en oublie de respirer. »",
       "Attends, tu l'as vraiment trouvée ? C'est incroyable ! Je cherche cette recette depuis douze ans. D'accord, d'accord, laisse-moi réfléchir. "
       "Il nous faut deux tasses de farine, une pincée de sel et, honnêtement, un peu de chance. "
       "Vite, préchauffe le four à cent quatre-vingts degrés, et surtout, n'oublie pas le beurre cette fois !")

_extra("es", _T,
       "El viejo faro se alzaba al borde del acantilado, y cada tarde, justo antes del atardecer, María subía por sus estrechas escaleras. "
       "—¿Nunca te cansas de esta vista? —preguntó su hermano. Ella sonrió. "
       "—Nunca. Cada noche el mar cuenta una historia distinta, a veces tranquila, a veces salvaje, y a veces tan hermosa que me olvido de respirar.",
       "¡Espera, de verdad la encontraste! ¡Es increíble! Llevo doce años buscando esa receta. Vale, vale, déjame pensar. "
       "Necesitamos dos tazas de harina, una pizca de sal y, siendo sincera, un poco de suerte. "
       "¡Rápido, precalienta el horno a ciento ochenta grados y, por favor, no te olvides de la mantequilla esta vez!")

_extra("it", _T,
       "Il vecchio faro sorgeva sul bordo della scogliera, e ogni sera, poco prima del tramonto, Maria saliva le sue strette scale. "
       "«Non ti stanchi mai di questa vista?» chiese suo fratello. Lei sorrise. "
       "«Mai. Ogni notte il mare racconta una storia diversa, a volte tranquilla, a volte selvaggia, e a volte così bella che dimentico di respirare.»",
       "Aspetta, l'hai trovata davvero? È incredibile! Cerco quella ricetta da dodici anni. Va bene, va bene, fammi pensare. "
       "Ci servono due tazze di farina, un pizzico di sale e, onestamente, un po' di fortuna. "
       "Presto, preriscalda il forno a centottanta gradi e, ti prego, stavolta non dimenticare il burro!")

_extra("pt", _T,
       "O velho farol erguia-se à beira do penhasco, e todas as noites, pouco antes do pôr do sol, Maria subia as suas escadas estreitas. "
       "— Nunca te cansas desta vista? — perguntou o irmão. Ela sorriu. "
       "— Nunca. Cada noite o mar conta uma história diferente, às vezes calma, às vezes selvagem, e às vezes tão bonita que me esqueço de respirar.",
       "Espera, encontraste mesmo? É incrível! Ando à procura dessa receita há doze anos. Está bem, está bem, deixa-me pensar. "
       "Precisamos de duas chávenas de farinha, uma pitada de sal e, sinceramente, um pouco de sorte. "
       "Depressa, pré-aquece o forno a cento e oitenta graus e, por favor, desta vez não te esqueças da manteiga!")

_extra("ru", _T,
       "Старый маяк стоял на краю обрыва, и каждый вечер, незадолго до заката, Мария поднималась по его узкой лестнице. "
       "«Тебе не надоедает этот вид?» — спросил её брат. Она улыбнулась. "
       "«Никогда. Каждую ночь море рассказывает новую историю: то тихую, то бурную, а иногда такую красивую, что я забываю дышать.»",
       "Подожди, ты правда её нашёл? Это невероятно! Я искала этот рецепт двенадцать лет. Так, так, дай подумать. "
       "Нам нужно две чашки муки, щепотка соли и, честно говоря, немного везения. "
       "Быстрее, разогрей духовку до ста восьмидесяти градусов и, пожалуйста, на этот раз не забудь про масло!")

_extra("zh", _T,
       "老灯塔矗立在悬崖边，每天傍晚日落之前，玛丽亚都会爬上那狭窄的楼梯。“你看这风景，难道不会腻吗？”她的哥哥问。她笑了笑。"
       "“永远不会。每个夜晚，大海都在讲述不同的故事，有时安静，有时狂野，有时美得让我忘记了呼吸。”",
       "等一下，你真的找到了吗？太不可思议了！我找这个食谱已经找了十二年。好，好，让我想想。"
       "我们需要两杯面粉，一小撮盐，说实话，还需要一点运气。快，把烤箱预热到一百八十度，这一次千万别忘了黄油！")

_extra("ar", _T,
       "كانت المنارة القديمة تقف على حافة الجرف، وكل مساء، قبل الغروب بقليل، كانت مريم تصعد درجاتها الضيقة. "
       "«ألا تملّين من هذا المنظر؟» سألها أخوها. ابتسمت وقالت: «أبدًا. في كل ليلة يروي البحر حكاية مختلفة، أحيانًا هادئة، وأحيانًا عاصفة، "
       "وأحيانًا جميلة إلى درجة أنني أنسى أن أتنفس.»",
       "انتظر، هل وجدتها حقًا؟ هذا لا يصدق! أبحث عن هذه الوصفة منذ اثنتي عشرة سنة. حسنًا، حسنًا، دعني أفكر. "
       "نحتاج إلى كوبين من الدقيق، وقليل من الملح، وبصراحة، قليل من الحظ. "
       "أسرع، سخّن الفرن إلى مئة وثمانين درجة، ولا تنسَ الزبدة هذه المرة من فضلك!")

_extra("hi", _T,
       "पुराना लाइटहाउस चट्टान के किनारे खड़ा था, और हर शाम सूरज ढलने से ठीक पहले मारिया उसकी तंग सीढ़ियाँ चढ़ती थी। "
       "“क्या तुम इस नज़ारे से कभी नहीं थकतीं?” उसके भाई ने पूछा। वह मुस्कुराई। "
       "“कभी नहीं। हर रात समंदर एक नई कहानी सुनाता है, कभी शांत, कभी तूफ़ानी, और कभी इतनी सुंदर कि मैं साँस लेना भूल जाती हूँ।”",
       "रुको, क्या तुम्हें सच में वह मिल गई? यह तो कमाल है! मैं बारह साल से उस नुस्खे को ढूँढ रही थी। ठीक है, ठीक है, मुझे सोचने दो। "
       "हमें दो कप आटा, एक चुटकी नमक और, सच कहूँ तो, थोड़ी सी किस्मत चाहिए। "
       "जल्दी करो, ओवन को एक सौ अस्सी डिग्री पर गरम करो, और इस बार मक्खन मत भूलना, प्लीज़!")

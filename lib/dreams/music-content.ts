import type { DreamSections } from "../dream-dictionary";
import type { Locale } from "../i18n/config";
import type { EntryL10nOverride } from "../i18n/entry-overrides/types";

type Prose = Pick<DreamSections, "introduction" | "general" | "psychological" | "spiritual" | "islamic" | "biblical">;
function article(seoTitle: string, seoDescription: string, prose: Prose, scenarios: [string, string][], faq: [string, string][]): EntryL10nOverride & { sections: DreamSections } {
  return { seoTitle, seoDescription, sections: { ...prose,
    commonScenarios: scenarios.map(([title, meaning]) => ({ title, meaning })),
    faq: faq.map(([question, answer]) => ({ question, answer })),
  } };
}

/** Native editorial copy for the 🎶 music entry. Links stay out of first paragraphs and structured data. */
export const MUSIC_CONTENT: Record<Locale, ReturnType<typeof article>> = {
  en: article(
    "Music Dream Meaning: Songs, Singing, and Musical Notes",
    "What does music in a dream mean? Explore familiar songs, singing, concerts, loud music, and musical notes through four interpretive perspectives.",
    {
      introduction: [
        "Music in a dream can give a feeling a form before you have words for it. A familiar song may draw attention to a relationship or an earlier version of yourself; an unfamiliar melody may fit a mood you are only beginning to recognize. The most useful clues are how the music felt, who chose it, and whether you could listen, join in, or turn it off. Musical notes are a symbol of sound and expression, not a promise that something particular will happen.",
        "Begin with the scene rather than a universal song dictionary. Music at a [wedding](/dreams/wedding), inside a [church](/dreams/church), through a [phone](/dreams/phone), or from a [singing bird](/dreams/singing-bird) changes what the sound belongs to. If a lyric matters, write the exact words you remember without trying to complete them after waking.",
      ],
      general: [
        "Pleasant music may suggest belonging, relief, shared celebration, or a wish for more ease. Harsh, distorted, or unwanted music may echo interruption, pressure, or the experience of having someone else's mood fill your space. Sad music can feel comforting rather than threatening. Ask whether the sound supported your feelings or told you how you were supposed to feel.",
        "Pay attention to your role. Choosing a track is different from being unable to stop it; singing alone differs from performing before a crowd. A stage can place recognition and exposure at the center, especially when a [celebrity](/dreams/celebrity) is present. Rehearsing in a [school](/dreams/school) may bring learning or evaluation into the scene rather than fame.",
        "Written notes, an unreadable score, a broken instrument, or a song that stops just before its ending can suggest expression that needs a different form or an unfinished conversation. These are possibilities to compare with your circumstances. There is no reliable rule that a major key means good news or a minor key means loss.",
      ],
      psychological: [
        "A personal reading starts with association: when did you last hear this song, and who comes to mind? A tune linked to childhood can bring up safety, embarrassment, longing, or family expectations. Music heard during the day, a nearby device, or a recent performance may also provide a straightforward source for the dream; not every detail needs a hidden explanation.",
        "Notice the emotional mismatch. A cheerful chorus over a frightening scene may resemble the pressure to look fine when you are struggling. A lullaby associated with your [mother](/dreams/mother) or a [child](/dreams/child) may concern comfort and responsibility. If the music accompanied [crying](/dreams/crying), ask what it allowed you to feel rather than assuming sadness predicts a future event.",
      ],
      spiritual: [
        "As a spiritual metaphor, music may invite reflection on attention, harmony, silence, and the pace at which you are living. Harmony does not require everyone to sing the same note: a dream ensemble can raise questions about cooperation without surrendering your own voice. This is a reflective reading, not evidence of a supernatural message.",
        "Ask what the silence after the song was like. Restful silence may feel different from sudden abandonment. Record the melody's mood, the people present, and what changed when the sound ended in Dreamly. Compare those details over time; your own recurring associations are more useful than assigning a permanent meaning to 🎶.",
      ],
      islamic: [
        "For a Muslim reader, hearing music in a dream does not by itself establish good fortune, wrongdoing, or anyone's religious standing. The emoji is a modern label, not a fixed interpretive sign. Reflect on the setting, your feelings, and whether the scene draws attention to distraction, celebration, companionship, or a matter of conscience.",
        "Distinguish a song from speech, recitation, and other sounds you may have heard: they should not be treated as interchangeable. If a scene takes place in a religious setting, consider the place as well as the sound. A dream alone cannot settle a religious ruling or justify an accusation; questions about practice belong with a trusted, qualified adviser.",
      ],
      biblical: [
        "A Christian reading may explore music through worship, gratitude, lament, and life in community. A song can offer a way to name sorrow as well as joy. These are devotional associations a reader may bring to the dream, not a biblical code declaring that every melody is a message or a prediction.",
        "If the dream happens in a [church](/dreams/church), notice whether singing brings welcome, obligation, or exclusion. A missed note need not mean spiritual failure, and a beautiful chorus does not establish divine approval of a decision. Let reflection lead toward honest prayer, conversation, and actions that can be assessed in waking life.",
      ],
    },
    [
      ["Hearing a favorite song", "A personal memory, relationship, or mood may be returning. Identify the period of life you associate with it."],
      ["Singing alone", "A wish to express something privately, or the pleasure of having a voice without needing an audience."],
      ["Singing onstage and forgetting the words", "Exposure, evaluation, or pressure to perform may matter more than the song itself."],
      ["Loud music you cannot stop", "An unwanted demand or another person's mood may feel difficult to keep outside your space."],
      ["A sad song that feels comforting", "Making room for grief or tenderness, rather than a warning that something bad will happen."],
      ["An unfamiliar melody", "An emerging feeling, curiosity, or a creative scene without an obvious waking-life reference."],
      ["Reading musical notes or playing an instrument", "Learning, coordination, and finding a workable form for something you want to express."],
      ["Music suddenly stops", "An interruption, an unfinished exchange, or a shift from shared activity to being alone."],
    ],
    [
      ["What does 🎶 mean on the Dreamly map?", "It marks the music or musical-notes theme assigned to a dream. The icon links to this general article; it does not reveal the full dream or describe every detail of it."],
      ["Is hearing music in a dream a good sign?", "It has no fixed positive or negative meaning. Whether the music felt welcome, intrusive, joyful, or sad gives a more useful starting point."],
      ["Does a song lyric predict the future?", "A remembered lyric is not reliable evidence about the future. Consider your personal associations and current circumstances instead."],
      ["What if I wake up with a song in my head?", "Write down what you remember and note whether you recently heard it. A song remaining in memory does not by itself establish a special message."],
      ["Can this article interpret my whole dream?", "It offers possible readings of one symbol. For a fuller reflection, record the scene, people, events, and feelings in Dreamly and consider them together."],
    ],
  ),
  ru: article(
    "К чему снится музыка: песни, пение и музыкальные ноты",
    "Музыка во сне: знакомые песни, собственное пение, концерт, громкие звуки и ноты. Психологический, духовный, исламский и библейский взгляд.",
    {
      introduction: [
        "Во сне музыка иногда точнее слов передаёт то, что мы чувствуем. Старая песня может вернуть не столько событие, сколько ощущение себя в то время; незнакомая мелодия — придать форму настроению, которому пока трудно подобрать название. Важнее всего, было ли приятно слушать, кто включил музыку и могли ли вы подпевать, уйти или выключить звук. Сам образ нот не обещает определённого события.",
        "Сначала восстановите обстановку. Музыка на [свадьбе](/dreams/wedding), в [церкви](/dreams/church), из [телефона](/dreams/phone) или пение [птицы](/dreams/singing-bird) принадлежат разным историям. Если запомнились слова песни, запишите именно их: не дополняйте пропуски знакомым куплетом уже после пробуждения.",
      ],
      general: [
        "Приятная мелодия может напоминать о близости, передышке, празднике или желании жить в более подходящем ритме. Навязчивый шум, фальшивые ноты и музыка, которую нельзя выключить, иногда созвучны перегрузке: чужое настроение занимает всё пространство. При этом грустная песня бывает утешением. Спросите себя: звук поддерживал ваше чувство или требовал испытывать что-то другое?",
        "Ваша роль тоже меняет смысл. Выбирать песню — не то же самое, что терпеть чужую; петь наедине — не то же самое, что выступать перед залом. Появление [знаменитости](/dreams/celebrity) может добавить тему признания и сравнения, а репетиция в [школе](/dreams/school) — переживание оценки, обучения или права ошибаться.",
        "Неразборчивая партитура, сломанный инструмент, забытые слова или оборванная на середине песня позволяют подумать о трудности выразиться и незавершённом разговоре. Но сначала проверьте простое объяснение: недавний концерт, репетицию или музыку у соседей. Минор не означает предстоящую потерю, а мажор не гарантирует хороших новостей.",
      ],
      psychological: [
        "Начните с личного вопроса: когда вы слышали эту мелодию и с кем она связана? Одна и та же песня для одного человека означает поддержку, для другого — неловкий школьный вечер, для третьего — завершившиеся отношения. Название жанра и популярное толкование менее полезны, чем ваша собственная история. Недавно услышанная музыка также может оказаться обычным материалом сна.",
        "Обратите внимание на несоответствие звука происходящему. Весёлый припев в тревожной сцене может напоминать необходимость изображать благополучие. Колыбельная рядом с [матерью](/dreams/mother) или [ребёнком](/dreams/child) приглашает подумать о заботе, зависимости и отдыхе. Если вы [плакали](/dreams/crying), важнее понять, что стало возможным почувствовать, чем искать предсказание в мелодии.",
      ],
      spiritual: [
        "В духовном размышлении музыка может стать образом согласованности, внимания к себе и умения слышать другого. Гармония не требует одинаковых голосов: совместное пение иногда ставит вопрос о близости, в которой остаётся место собственной интонации. Такое прочтение — способ исследовать переживание, а не доказательство сверхъестественного послания.",
        "Вспомните и тишину после музыки. Она принесла покой или ощущение, что вас оставили? В Dreamly сохраните настроение мелодии, участников сцены и перемену после последней ноты. Сравнение нескольких записей помогает заметить личные связи образа, не превращая 🎶 в универсальную формулу.",
      ],
      islamic: [
        "Для мусульманина сон с музыкой сам по себе не определяет благополучие, греховность или духовное положение человека. Современный значок нот не является самостоятельным ключом к толкованию. Полезнее рассмотреть место действия, собственную реакцию и темы, которые возникли: отвлечение, торжество, компания, сомнение или внутреннее беспокойство.",
        "Важно не смешивать песню, речь, чтение и другие услышанные звуки. Если действие связано с религиозным пространством, учитывайте и его значение. Сон не устанавливает религиозную норму и не служит основанием судить окружающих. Практические вопросы веры стоит обсуждать с компетентным наставником, опираясь на обстоятельства наяву.",
      ],
      biblical: [
        "В христианском прочтении музыка может ассоциироваться с молитвой, благодарностью, плачем и общностью. Песня позволяет обращаться к радости и горю, не требуя немедленно исправить чувство. Это возможный язык духовного размышления, а не библейский шифр, по которому любая мелодия сообщает будущее.",
        "Если вы пели в [церкви](/dreams/church), спросите, чувствовали ли себя принятым, обязанным участвовать или оставшимся за пределами общего хора. Фальшивая нота не доказывает духовной неудачи, а красивое пение не подтверждает правильность важного решения. Смысл размышления можно проверить честным разговором, молитвой и поступками в обычной жизни.",
      ],
    },
    [
      ["Услышать любимую песню", "Вспомните, с кем и с каким временем она связана: личная ассоциация важнее общего значения названия."],
      ["Петь в одиночестве", "Возможность выразить чувство без оценки или желание сказать то, что пока трудно произнести в разговоре."],
      ["Забыть слова на сцене", "Уязвимость перед чужой оценкой, ожидание безошибочного выступления или страх не оправдать роль."],
      ["Не получается выключить громкую музыку", "Перегрузка, нарушенные границы или ощущение, что чужие требования не оставляют места вашим потребностям."],
      ["Грустная песня приносит облегчение", "Разрешение на нежность, тоску или печаль; само чувство не предсказывает беду."],
      ["Незнакомая мелодия", "Новое настроение, любопытство или творческий образ, которому не обязательно нужен буквальный источник."],
      ["Читать ноты или играть на инструменте", "Учиться согласовывать действия, находить свой темп и форму для того, что хочется выразить."],
      ["Музыка внезапно обрывается", "Незавершённый обмен, прерванная близость или резкий переход от общего события к одиночеству."],
    ],
    [
      ["Что означает 🎶 на карте Dreamly?", "Значок обозначает тему музыки или музыкальных нот, выделенную в сне. Он ведёт к общей статье и не раскрывает чужой сон целиком."],
      ["Музыка во сне — хороший знак?", "У неё нет постоянного положительного или отрицательного значения. Начните с того, была ли она желанной, навязчивой, радостной или печальной."],
      ["Могут ли слова песни предсказывать события?", "Запомнившаяся строка не является надёжным знанием о будущем. Полезнее сопоставить её с вашими воспоминаниями и нынешними обстоятельствами."],
      ["Почему после пробуждения песня остаётся в голове?", "Запишите сохранившийся фрагмент и вспомните, не слышали ли вы его недавно. Само присутствие мелодии в памяти не подтверждает особого послания."],
      ["Достаточно этой статьи для толкования всего сна?", "Она помогает рассмотреть один символ. Для более полного размышления запишите в Dreamly обстановку, людей, события и чувства и прочитайте их вместе."],
    ],
  ),
  es: article(
    "Soñar con música: canciones, canto y notas musicales",
    "Explora qué puede expresar la música en sueños: canciones conocidas, conciertos, cantar, sonidos fuertes y partituras desde cuatro perspectivas.",
    {
      introduction: [
        "A veces un sueño pone música donde todavía no encontramos palabras. Una canción de otra etapa puede devolver una forma de sentirnos, más que un recuerdo completo; una melodía desconocida puede acompañar una emoción nueva. Antes de buscar un significado fijo, recuerda si disfrutabas escuchar, quién elegía la música y si podías cantar, salir o bajar el volumen. Ver notas musicales no anuncia por sí solo un acontecimiento.",
        "El lugar da contexto: no cuenta la misma historia una canción en una [boda](/dreams/wedding), dentro de una [iglesia](/dreams/church), desde un [teléfono](/dreams/phone) o el canto de un [pájaro](/dreams/singing-bird). Si recuerdas una frase, anótala tal como apareció; no rellenes después los huecos con la letra que ya conoces.",
      ],
      general: [
        "La música agradable puede sugerir compañía, descanso, celebración o ganas de recuperar un ritmo propio. Un sonido impuesto, distorsionado o imposible de apagar puede parecerse a la saturación de convivir con demandas ajenas. Una canción triste también puede consolar. La pregunta es si la música hacía espacio para lo que sentías o te obligaba a sentir algo distinto.",
        "Elegir la canción no es igual que soportar la selección de alguien más. Cantar a solas deja una libertad distinta a hacerlo frente a un público. Si aparece una [celebridad](/dreams/celebrity), quizá importe el reconocimiento; si ensayas en una [escuela](/dreams/school), pueden pesar más el aprendizaje, la evaluación o el permiso para equivocarte.",
        "Una partitura ilegible, un instrumento que no responde o una canción que termina a la mitad pueden servir para explorar algo que no logras expresar. También conviene recordar un concierto reciente o un sonido real cercano. No hay una regla fiable que convierta una tonalidad alegre en buenas noticias ni una melodía triste en un presagio de pérdida.",
      ],
      psychological: [
        "Empieza por tus asociaciones: ¿cuándo escuchaste esa canción y quién estaba contigo? La misma melodía puede significar refugio para alguien y vergüenza o despedida para otra persona. El género musical importa menos que esa historia personal. Una canción escuchada durante el día también puede entrar en el sueño sin esconder una explicación especial.",
        "Observa los contrastes: una fiesta sonora en una escena angustiante puede recordar la exigencia de aparentar que todo está bien. Una canción de cuna vinculada con tu [madre](/dreams/mother) o un [niño](/dreams/child) puede abrir preguntas sobre cuidado y descanso. Si estabas [llorando](/dreams/crying), considera qué emoción pudo encontrar salida gracias a la música.",
      ],
      spiritual: [
        "Como imagen espiritual, la música invita a pensar en escucha, armonía y ritmo. Un conjunto funciona sin que todas las voces sean idénticas: quizá el sueño permita explorar cómo pertenecer sin renunciar a tu manera de expresarte. Es una posibilidad de reflexión, no una prueba de que hayas recibido un mensaje sobrenatural.",
        "Recuerda también el silencio al terminar: ¿trajo paz o dejó una sensación de abandono? En Dreamly puedes guardar el ambiente, las personas y el cambio que produjo la última nota. Volver a varias entradas permite reconocer tus propias asociaciones sin asignar a 🎶 una definición inmutable.",
      ],
      islamic: [
        "Para una persona musulmana, oír música en un sueño no establece por sí solo buena fortuna, culpa ni la condición espiritual de alguien. El emoji es una etiqueta actual, no una clave interpretativa fija. Importan el contexto, la reacción personal y los temas de celebración, distracción, convivencia o conciencia que la escena te permita considerar.",
        "Distingue una canción del habla, la recitación y otros sonidos; no son intercambiables. Si aparece un espacio religioso, toma en cuenta el lugar además de lo que escuchaste. Un sueño no resuelve una norma religiosa ni justifica juzgar a otra persona. Las dudas sobre la práctica pueden conversarse con alguien de confianza y formación adecuada.",
      ],
      biblical: [
        "Una lectura cristiana puede relacionar la música con oración, gratitud, lamento y comunidad. Cantar ofrece una manera de expresar tanto tristeza como alegría. Son asociaciones para la reflexión espiritual, no un código bíblico que convierta cada melodía en una predicción o una instrucción divina.",
        "Si cantabas en una [iglesia](/dreams/church), nota si sentías acogida, obligación o exclusión. Desafinar no demuestra fracaso espiritual y un coro hermoso no confirma una decisión importante. La reflexión puede acompañarse de oración, conversación honesta y acciones que puedas valorar en la vida cotidiana.",
      ],
    },
    [
      ["Escuchar tu canción favorita", "Una relación, una época o una sensación de identidad pueden estar presentes a través de una asociación personal."],
      ["Cantar a solas", "Expresión íntima, libertad de jugar con tu voz o deseo de decir algo sin recibir una evaluación."],
      ["Olvidar la letra frente al público", "Exposición, miedo a equivocarte o presión por cumplir las expectativas de una actuación."],
      ["No poder apagar la música fuerte", "Saturación o dificultad para proteger tu espacio de las demandas y el ánimo de otras personas."],
      ["Sentir alivio con una canción triste", "Permiso para la nostalgia o la ternura; no indica que vaya a ocurrir una desgracia."],
      ["Escuchar una melodía desconocida", "Curiosidad o una emoción nueva que el sueño presenta sin una referencia evidente."],
      ["Leer notas o tocar un instrumento", "Aprender, coordinar esfuerzos o buscar una forma de expresar algo que todavía necesita práctica."],
      ["La música se corta de repente", "Interrupción de una conexión, conversación pendiente o cambio brusco en el ambiente compartido."],
    ],
    [
      ["¿Qué significa 🎶 en el mapa de Dreamly?", "Marca el tema de música o notas musicales identificado en un sueño. Enlaza a esta explicación general y no muestra el relato completo de otra persona."],
      ["¿Soñar con música es una buena señal?", "No tiene un valor positivo o negativo fijo. Importa más si el sonido resultaba agradable, invasivo, alegre o triste para ti."],
      ["¿La letra de una canción predice el futuro?", "Una frase recordada no ofrece conocimiento fiable sobre lo que pasará. Compárala con tus recuerdos y circunstancias actuales."],
      ["¿Y si despierto con la canción en la cabeza?", "Anota el fragmento y considera si lo escuchaste recientemente. Que siga en tu memoria no demuestra un mensaje especial."],
      ["¿Esta página interpreta todo mi sueño?", "Explora un símbolo. Para una reflexión más completa, registra en Dreamly el lugar, las personas, lo ocurrido y tus emociones."],
    ],
  ),
  pt: article(
    "Sonhar com música: canções, canto e notas musicais",
    "Entenda possíveis sentidos da música nos sonhos: canções conhecidas, shows, cantar, som alto e partituras, com quatro perspectivas de interpretação.",
    {
      introduction: [
        "No sonho, a música pode dar forma a um sentimento que ainda não encontrou palavras. Uma canção antiga às vezes traz de volta o jeito como você se sentia naquela época, e não uma lembrança inteira. Uma melodia desconhecida pode acompanhar um estado de espírito novo. Antes de buscar uma definição, observe se era bom ouvir, quem escolhia a música e se você podia cantar junto, sair ou desligar o som. Notas musicais não anunciam um acontecimento por si mesmas.",
        "O cenário muda a leitura: música em um [casamento](/dreams/wedding), em uma [igreja](/dreams/church), saindo do [celular](/dreams/phone) ou no canto de um [pássaro](/dreams/singing-bird) participa de histórias diferentes. Se lembrar de uma frase da letra, registre só o que apareceu no sonho, sem completar as partes que faltam depois de acordar.",
      ],
      general: [
        "Uma música agradável pode sugerir companhia, alívio, comemoração ou vontade de viver num ritmo mais seu. Som distorcido, imposto ou impossível de desligar pode lembrar a sensação de não ter espaço diante das exigências dos outros. Uma canção triste também pode acolher. Pergunte se a música acompanhava seu sentimento ou parecia mandar no que você deveria sentir.",
        "Escolher a faixa é diferente de aguentar a seleção de outra pessoa. Cantar sozinho permite algo diferente de se apresentar para uma plateia. A presença de uma [celebridade](/dreams/celebrity) pode destacar reconhecimento e comparação; ensaiar numa [escola](/dreams/school) pode trazer aprendizado, avaliação e a possibilidade de errar enquanto se aprende.",
        "Partitura que não dá para ler, instrumento quebrado e música interrompida antes do final podem ajudar a pensar numa expressão que não encontra caminho ou numa conversa inacabada. Considere também um show recente ou um aparelho tocando perto de você. Não existe uma regra confiável segundo a qual uma melodia alegre anuncia sorte e uma melodia triste anuncia perda.",
      ],
      psychological: [
        "O ponto de partida é pessoal: quando você ouviu essa música e com quem ela ficou associada? Para alguém, a mesma canção lembra acolhimento; para outra pessoa, uma festa constrangedora ou uma despedida. O gênero musical conta menos do que essa história. Uma música ouvida durante o dia também pode entrar no sonho sem precisar de uma explicação escondida.",
        "Repare quando o som e a cena não combinam. Uma trilha animada num momento de medo pode lembrar a obrigação de parecer bem. Uma cantiga ligada à sua [mãe](/dreams/mother) ou a uma [criança](/dreams/child) pode abrir questões sobre cuidado e descanso. Se você estava [chorando](/dreams/crying), observe qual sentimento pôde aparecer, em vez de tomar a tristeza como previsão.",
      ],
      spiritual: [
        "Como imagem espiritual, a música pode convidar à escuta, à harmonia e à atenção ao próprio ritmo. Um conjunto não precisa de vozes idênticas para funcionar: o sonho talvez permita pensar em pertencer sem abandonar sua maneira de se expressar. Essa é uma leitura reflexiva, não uma confirmação de mensagem sobrenatural.",
        "Lembre também do silêncio depois da canção. Ele trouxe paz ou deixou uma sensação de abandono? Em Dreamly, registre o clima da música, quem estava presente e o que mudou na última nota. Comparar registros pode revelar associações suas, sem transformar 🎶 numa fórmula que serve para todo mundo.",
      ],
      islamic: [
        "Para uma pessoa muçulmana, ouvir música num sonho não estabelece, por si só, boa sorte, culpa ou a condição espiritual de alguém. O emoji é um rótulo moderno, não uma chave fixa de interpretação. Considere o lugar, sua reação e as questões de distração, convivência, celebração ou consciência que a cena permite examinar.",
        "Diferencie uma canção de fala, recitação e outros sons: não são experiências intercambiáveis. Se houver um ambiente religioso, leve em conta também o lugar. Um sonho não resolve uma norma religiosa nem autoriza julgar outra pessoa. Dúvidas sobre a prática podem ser discutidas com alguém de confiança e formação adequada.",
      ],
      biblical: [
        "Numa leitura cristã, a música pode se ligar à oração, à gratidão, ao lamento e à vida em comunidade. Cantar pode dar lugar à dor tanto quanto à alegria. São associações possíveis para a reflexão de fé, não um código bíblico que transforma toda melodia em previsão ou ordem divina.",
        "Se você cantava numa [igreja](/dreams/church), perceba se havia acolhimento, obrigação ou exclusão. Uma nota desafinada não demonstra fracasso espiritual, e um coro bonito não comprova que uma decisão está certa. A reflexão pode acompanhar oração, conversa honesta e atitudes que possam ser avaliadas na vida desperta.",
      ],
    },
    [
      ["Ouvir uma música favorita", "Uma pessoa, fase da vida ou sensação de identidade pode voltar por meio de uma associação pessoal."],
      ["Cantar sozinho", "Expressão íntima, liberdade para experimentar a própria voz ou vontade de dizer algo sem ser avaliado."],
      ["Esquecer a letra no palco", "Exposição, receio de errar ou pressão para corresponder às expectativas diante de outras pessoas."],
      ["Não conseguir desligar o som alto", "Sobrecarga ou dificuldade de preservar seu espaço diante das demandas e do humor dos outros."],
      ["Sentir alívio com uma canção triste", "Espaço para saudade, ternura ou pesar, sem que isso anuncie um acontecimento ruim."],
      ["Ouvir uma melodia desconhecida", "Curiosidade ou um sentimento novo que o sonho apresenta sem uma referência evidente."],
      ["Ler notas ou tocar um instrumento", "Aprendizado, coordenação e busca de uma forma de expressão que ainda precisa de prática."],
      ["A música para de repente", "Uma conexão interrompida, conversa sem conclusão ou mudança brusca no ambiente compartilhado."],
    ],
    [
      ["O que 🎶 significa no mapa de Dreamly?", "O ícone marca o tema de música ou notas musicais identificado num sonho. Ele leva a esta explicação geral e não revela o relato completo de outra pessoa."],
      ["Sonhar com música é um bom sinal?", "Não existe um valor positivo ou negativo fixo. Importa mais se, para você, o som era agradável, invasivo, alegre ou triste."],
      ["Uma letra de música pode prever o futuro?", "Uma frase lembrada não oferece conhecimento confiável do futuro. Compare-a com suas memórias e com as circunstâncias atuais."],
      ["E se eu acordar com a música na cabeça?", "Anote o trecho e veja se você o ouviu recentemente. O fato de a canção continuar na memória não confirma uma mensagem especial."],
      ["Esta página interpreta meu sonho inteiro?", "Ela explora um símbolo. Para uma reflexão mais completa, registre em Dreamly o lugar, as pessoas, os acontecimentos e seus sentimentos."],
    ],
  ),
  de: article(
    "Musik im Traum: Lieder, Singen und Musiknoten deuten",
    "Was kann Musik im Traum bedeuten? Bekannte Lieder, Singen, Konzerte, laute Musik und Noten aus psychologischer, spiritueller und religiöser Sicht.",
    {
      introduction: [
        "Musik kann im Traum einem Gefühl Ausdruck geben, für das noch die Worte fehlen. Ein altes Lied bringt manchmal weniger eine bestimmte Begebenheit zurück als das Lebensgefühl jener Zeit. Eine unbekannte Melodie kann zu einer Stimmung passen, die sich erst allmählich zeigt. Entscheidend ist, ob das Zuhören angenehm war, wer die Musik auswählte und ob Sie mitsingen, gehen oder den Ton abstellen konnten. Musiknoten allein kündigen kein bestimmtes Ereignis an.",
        "Beginnen Sie mit dem Schauplatz: Musik auf einer [Hochzeit](/dreams/wedding), in einer [Kirche](/dreams/church), aus einem [Telefon](/dreams/phone) oder der Gesang eines [Vogels](/dreams/singing-bird) gehört jeweils zu einer anderen Geschichte. Erinnern Sie sich an eine Textzeile, notieren Sie nur das tatsächlich Gehörte, ohne Lücken nachträglich mit dem bekannten Liedtext zu füllen.",
      ],
      general: [
        "Angenehme Musik kann Zugehörigkeit, Entlastung, gemeinsames Feiern oder den Wunsch nach einem passenderen Lebenstempo anklingen lassen. Aufgedrängte, verzerrte oder nicht abstellbare Musik kann dagegen an Überforderung erinnern: Die Stimmung anderer nimmt den ganzen Raum ein. Auch traurige Musik kann trösten. Begleitete der Klang Ihr Gefühl, oder schrieb er Ihnen vor, was Sie fühlen sollten?",
        "Die eigene Rolle verändert die Deutung. Ein Lied auszuwählen ist etwas anderes, als die Auswahl eines anderen hinnehmen zu müssen. Allein zu singen unterscheidet sich von einem Auftritt. Eine [berühmte Person](/dreams/celebrity) kann Anerkennung und Vergleiche in den Vordergrund rücken; eine Probe in der [Schule](/dreams/school) eher Lernen, Bewertung und den Umgang mit Fehlern.",
        "Unlesbare Noten, ein defektes Instrument oder ein Lied ohne Schluss können dazu anregen, über stockenden Ausdruck oder ein offenes Gespräch nachzudenken. Prüfen Sie zugleich naheliegende Quellen wie einen Konzertbesuch oder ein laufendes Gerät. Es gibt keine verlässliche Regel, nach der Dur gute Nachrichten und Moll einen bevorstehenden Verlust bedeutet.",
      ],
      psychological: [
        "Fragen Sie zunächst nach Ihrer persönlichen Verbindung: Wann haben Sie das Lied gehört, und an wen erinnert es Sie? Dieselbe Melodie kann Geborgenheit, einen peinlichen Schulabend oder eine Trennung aufrufen. Die eigene Geschichte ist aussagekräftiger als das Genre. Auch tagsüber gehörte Musik kann schlicht zum Material eines Traums werden, ohne eine verborgene Botschaft tragen zu müssen.",
        "Achten Sie auf Widersprüche zwischen Klang und Handlung. Ein fröhlicher Refrain in einer bedrohlichen Szene kann an den Druck erinnern, nach außen unbeschwert zu wirken. Ein Wiegenlied bei der [Mutter](/dreams/mother) oder einem [Kind](/dreams/child) kann Fürsorge und Ruhe berühren. Wenn Sie dabei [weinen](/dreams/crying), fragen Sie nach dem Gefühl, das Raum bekam, statt nach einer Vorhersage.",
      ],
      spiritual: [
        "Als spirituelles Bild kann Musik Fragen nach Zuhören, Zusammenspiel und dem eigenen Rhythmus öffnen. Harmonie bedeutet nicht, dass alle dieselbe Stimme haben: Ein Ensemble kann dafür stehen, verbunden zu sein und dennoch die eigene Ausdrucksweise zu bewahren. Das ist eine Möglichkeit zur Selbstbetrachtung, kein Nachweis einer übernatürlichen Mitteilung.",
        "Erinnern Sie sich auch an die Stille danach. War sie friedlich oder fühlten Sie sich zurückgelassen? Halten Sie in Dreamly die Stimmung, die Anwesenden und die Veränderung nach dem letzten Ton fest. Mehrere Einträge können persönliche Zusammenhänge erkennen lassen, ohne 🎶 eine dauerhaft gültige Bedeutung zuzuschreiben.",
      ],
      islamic: [
        "Für muslimische Leserinnen und Leser entscheidet Musik im Traum für sich genommen weder über Glück oder Schuld noch über den religiösen Zustand einer Person. Das Emoji ist eine moderne Kennzeichnung und kein fester Deutungsschlüssel. Betrachten Sie den Ort, Ihre Reaktion und mögliche Themen wie Ablenkung, Gemeinschaft, Feier oder eine Gewissensfrage.",
        "Unterscheiden Sie ein Lied von Sprache, Rezitation und anderen Lauten; diese Erfahrungen sind nicht austauschbar. Bei einem religiösen Schauplatz zählt auch dessen Zusammenhang. Ein Traum allein begründet weder eine religiöse Regel noch ein Urteil über andere. Fragen der Glaubenspraxis gehören in ein Gespräch mit einer vertrauenswürdigen, fachkundigen Person.",
      ],
      biblical: [
        "In einer christlichen Betrachtung kann Musik mit Gebet, Dankbarkeit, Klage und Gemeinschaft verbunden sein. Singen kann Trauer ebenso einen Ausdruck geben wie Freude. Solche Bezüge sind mögliche Anregungen für die Glaubensreflexion, kein fester biblischer Deutungsschlüssel und keine Regel, nach der jede Melodie eine göttliche Anweisung oder Vorhersage darstellt.",
        "Wenn Sie in einer [Kirche](/dreams/church) singen, achten Sie darauf, ob Sie sich willkommen, verpflichtet oder ausgeschlossen fühlen. Ein falscher Ton beweist kein geistliches Versagen; ein schöner Chor bestätigt nicht automatisch eine Entscheidung. Prüfen lässt sich eine Einsicht durch ehrliches Gespräch, Gebet und verantwortliches Handeln im Alltag.",
      ],
    },
    [
      ["Ein Lieblingslied hören", "Eine persönliche Verbindung kann eine Beziehung, Lebensphase oder vertraute Sicht auf sich selbst wachrufen."],
      ["Allein singen", "Privater Ausdruck, Freude an der eigenen Stimme oder der Wunsch, etwas ohne Bewertung auszusprechen."],
      ["Auf der Bühne den Text vergessen", "Sichtbarkeit, Bewertungsdruck oder die Sorge, eine erwartete Rolle nicht fehlerfrei erfüllen zu können."],
      ["Laute Musik lässt sich nicht abstellen", "Überforderung oder Schwierigkeiten, den eigenen Raum vor fremden Ansprüchen und Stimmungen zu schützen."],
      ["Ein trauriges Lied tröstet", "Raum für Sehnsucht, Zärtlichkeit oder Trauer; das Gefühl kündigt kein Unglück an."],
      ["Eine unbekannte Melodie hören", "Neugier oder ein neues Gefühl, das ohne eindeutige Erinnerung in einer musikalischen Szene erscheint."],
      ["Noten lesen oder ein Instrument spielen", "Lernen, Zusammenspiel und die Suche nach einer Ausdrucksform, die Übung und einen eigenen Takt braucht."],
      ["Die Musik bricht plötzlich ab", "Eine unterbrochene Verbindung, ein offenes Gespräch oder ein abrupter Wechsel der gemeinsamen Stimmung."],
    ],
    [
      ["Was bedeutet 🎶 auf der Dreamly-Karte?", "Das Symbol kennzeichnet das in einem Traum erkannte Thema Musik oder Musiknoten. Es führt zu diesem allgemeinen Artikel und zeigt nicht den vollständigen Traum einer anderen Person."],
      ["Ist Musik im Traum ein gutes Zeichen?", "Sie hat keine festgelegte positive oder negative Bedeutung. Wichtiger ist, ob Sie die Musik als angenehm, aufdringlich, fröhlich oder traurig erlebt haben."],
      ["Kann eine Liedzeile die Zukunft vorhersagen?", "Eine erinnerte Textzeile liefert kein verlässliches Wissen über die Zukunft. Hilfreicher ist der Vergleich mit eigenen Erinnerungen und gegenwärtigen Umständen."],
      ["Was bedeutet ein Lied, das nach dem Aufwachen im Kopf bleibt?", "Notieren Sie den erhaltenen Ausschnitt und überlegen Sie, ob Sie ihn kürzlich gehört haben. Dass er im Gedächtnis bleibt, belegt für sich keine besondere Botschaft."],
      ["Deutet dieser Artikel meinen ganzen Traum?", "Er betrachtet ein einzelnes Symbol. Halten Sie für eine umfassendere Reflexion in Dreamly auch Ort, Menschen, Handlung und Gefühle fest."],
    ],
  ),
  ar: article(
    "الموسيقى في المنام: الأغاني والغناء والنوتات الموسيقية",
    "تأمل معاني الموسيقى في المنام: أغنية مألوفة، الغناء، الحفلات، الصوت المرتفع والنوتات، بقراءات نفسية وروحية وإسلامية ومسيحية.",
    {
      introduction: [
        "قد تمنح الموسيقى في المنام شكلاً لشعور يصعب التعبير عنه بالكلام. أغنية قديمة قد تعيد إحساسك بنفسك في مرحلة سابقة، لا ذكرى حدث محدد فحسب، ولحن غير مألوف قد يصاحب مزاجاً لم تتضح لك تسميته بعد. الأهم هو شعورك أثناء الاستماع، ومن اختار الصوت، وهل استطعت الغناء معه أو مغادرة المكان أو إيقافه. ظهور النوتات وحده لا ينبئ بوقوع حدث معين.",
        "ابدأ بالمشهد: الموسيقى في [حفل زفاف](/dreams/wedding) تختلف في سياقها عن صوت داخل [كنيسة](/dreams/church)، أو صادر من [هاتف](/dreams/phone)، أو تغريد [طائر](/dreams/singing-bird). وإذا تذكرت كلمات أغنية، فاكتب ما سمعته فعلاً، ولا تملأ الفراغات بعد الاستيقاظ بما تعرفه من بقية الكلمات.",
      ],
      general: [
        "قد تذكّر الموسيقى المريحة بالألفة أو الاستراحة أو الاحتفال أو الرغبة في إيقاع حياة أنسب لك. أما الصوت المفروض عليك، أو المشوّه، أو الذي لا تستطيع إيقافه، فقد يشبه الإحساس بأن مطالب الآخرين تشغل مساحتك كلها. وقد تكون الأغنية الحزينة مواساة لا تهديداً. اسأل نفسك: هل أفسح الصوت مجالاً لشعورك أم فرض عليك شعوراً لا يشبه ما تعيشه؟",
        "اختيار الأغنية ليس مثل الاضطرار إلى سماع اختيار شخص آخر، والغناء منفرداً يختلف عن الوقوف أمام جمهور. قد يضيف وجود [شخص مشهور](/dreams/celebrity) موضوع الاعتراف بقدراتك أو المقارنة، بينما قد يثير التدريب في [مدرسة](/dreams/school) أسئلة التعلم والتقييم وحقك في الخطأ أثناء المحاولة.",
        "النوتات غير المقروءة، أو الآلة المعطلة، أو الأغنية التي تنقطع قبل نهايتها، صور يمكن أن تساعدك على التفكير في تعبير متعثر أو حديث لم يكتمل. تذكر أيضاً حفلاً قريباً أو جهازاً يصدر صوتاً حولك. لا توجد قاعدة موثوقة تجعل اللحن المبهج بشارة مؤكدة أو اللحن الحزين نذيراً بخسارة قادمة.",
      ],
      psychological: [
        "تبدأ القراءة الشخصية من ارتباطاتك أنت: متى سمعت هذه الأغنية، وبمن تذكّرك؟ قد تعني الأغنية نفسها الأمان لشخص، وموقفاً محرجاً أو وداعاً لشخص آخر. قصتك مع اللحن أكثر فائدة من تصنيف نوعه الموسيقي. كما يمكن لصوت سمعته خلال النهار أن يصبح جزءاً من المنام دون أن يحمل معنى خفياً.",
        "انتبه إلى التناقض بين الصوت والحدث. قد يذكّر لحن مرح داخل مشهد مخيف بالضغط لإظهار أنك بخير. وقد تفتح تهويدة مرتبطة بـ[الأم](/dreams/mother) أو بـ[طفل](/dreams/child) أسئلة الرعاية والراحة والاعتماد على الآخرين. وإذا صاحبها [بكاء](/dreams/crying)، ففكر في الشعور الذي وجد مجالاً للظهور، بدلاً من اعتبار الحزن توقعاً للمستقبل.",
      ],
      spiritual: [
        "بوصفها صورة للتأمل الروحي، قد تثير الموسيقى أسئلة الإصغاء والانسجام وإيقاع الحياة. لا يتطلب الانسجام أن تكون الأصوات متطابقة؛ فقد يدعوك الغناء الجماعي إلى التفكير في الانتماء مع الاحتفاظ بصوتك الخاص. هذه قراءة ممكنة للتجربة وليست دليلاً على وصول رسالة خارقة.",
        "تذكر الصمت الذي أعقب اللحن: هل كان راحة أم شعوراً بأنك تُركت وحيداً؟ سجّل في Dreamly جو الموسيقى ومن حضر وما تبدل بعد آخر نغمة. مقارنة عدة أحلام قد تكشف ارتباطات شخصية أدق من إسناد معنى واحد ثابت إلى الرمز 🎶.",
      ],
      islamic: [
        "للقارئ المسلم، سماع الموسيقى في المنام لا يثبت بمفرده بشارة أو ذنباً أو منزلة دينية لأي شخص. والرمز التعبيري الحديث ليس مفتاحاً ثابتاً للتأويل. يمكن التأمل في المكان ورد فعلك وما يثيره المشهد من موضوعات الاحتفال أو الصحبة أو الانشغال أو مراجعة النفس، دون تحويل الصورة إلى حكم قاطع.",
        "فرّق بين الأغنية والكلام والتلاوة وغيرها من الأصوات؛ فهذه ليست أشياء متبادلة في المعنى. وإذا كان المكان ذا طابع ديني، فانظر إلى سياقه أيضاً. لا يحسم المنام حكماً شرعياً ولا يبرر اتهام الآخرين. أما أسئلة الممارسة الدينية فتُناقش مع أهل العلم الموثوقين وبالرجوع إلى وقائع اليقظة.",
      ],
      biblical: [
        "في قراءة مسيحية، قد ترتبط الموسيقى بالصلاة والشكر والرثاء والحياة المشتركة. ويمكن للغناء أن يتيح التعبير عن الحزن كما يتيح التعبير عن الفرح. هذه روابط للتأمل الإيماني، لا شفرة كتابية تجعل كل لحن نبوءة أو أمراً إلهياً موجهاً إلى الحالم.",
        "إذا كنت تغني داخل [كنيسة](/dreams/church)، فلاحظ هل شعرت بالترحيب أو الإلزام أو الاستبعاد. النغمة الخاطئة لا تثبت فشلاً روحياً، والصوت الجميل لا يؤكد صحة قرار مصيري. يمكن أن يقود التأمل إلى صلاة صادقة وحوار مسؤول وأفعال تُراجع آثارها في الحياة اليومية.",
      ],
    },
    [
      ["سماع أغنية تحبها", "قد تحضر علاقة أو مرحلة من حياتك أو صورة مألوفة عن نفسك من خلال ارتباطك الشخصي بالأغنية."],
      ["الغناء منفرداً", "تعبير خاص، أو متعة اكتشاف صوتك، أو رغبة في قول شيء دون الخضوع لتقييم جمهور."],
      ["نسيان الكلمات أمام الجمهور", "الانكشاف أمام التقييم أو الخوف من الخطأ أو ضغط أداء الدور المتوقع منك بإتقان."],
      ["العجز عن إيقاف موسيقى مرتفعة", "إحساس بالضغط أو صعوبة حماية مساحتك من مطالب الآخرين ومزاجهم."],
      ["أغنية حزينة تمنحك راحة", "مساحة للشوق أو الحنان أو الحزن، وليس دليلاً على اقتراب مصيبة."],
      ["سماع لحن لا تعرفه", "فضول أو شعور جديد يظهر في مشهد لا يلزمه مصدر واضح من حياتك اليومية."],
      ["قراءة النوتات أو العزف على آلة", "التعلم وتنسيق الجهد والبحث عن أسلوب للتعبير يحتاج إلى تدريب وإيقاع مناسب."],
      ["انقطاع الموسيقى فجأة", "تواصل انقطع، أو حديث لم يكتمل، أو تحول مفاجئ من المشاركة إلى الوحدة."],
    ],
    [
      ["ماذا يعني 🎶 على خريطة Dreamly؟", "يشير إلى موضوع الموسيقى أو النوتات الذي تم تحديده في حلم. يقود إلى هذا المقال العام ولا يكشف حلم شخص آخر كاملاً."],
      ["هل الموسيقى في المنام علامة خير؟", "ليس لها معنى إيجابي أو سلبي ثابت. ابدأ بشعورك تجاه الصوت: هل كان مريحاً أم مفروضاً، مفرحاً أم حزيناً؟"],
      ["هل تتنبأ كلمات الأغنية بالمستقبل؟", "العبارة التي تتذكرها ليست معرفة موثوقة بما سيحدث. الأنسب مقارنتها بذكرياتك وظروفك الحالية."],
      ["ماذا لو بقي اللحن في ذهني بعد الاستيقاظ؟", "اكتب الجزء الذي تذكرته وفكر هل سمعته مؤخراً. بقاء الأغنية في الذاكرة وحده لا يثبت وجود رسالة خاصة."],
      ["هل يفسر هذا المقال حلمي كله؟", "يساعد على تأمل رمز واحد. ولرؤية أوسع، سجّل في Dreamly المكان والأشخاص والأحداث والمشاعر ثم انظر إليها معاً."],
    ],
  ),
};

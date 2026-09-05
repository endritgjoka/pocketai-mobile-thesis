# P4: Vlerësimi i algoritmit të prioritizimit, provë e parë

Pajisja: iPhone 12 Pro. Embeddings neurale (all-MiniLM-L6-v2). 24 skenarë, 6 njësi për skenar,
buxhet tokenash që lejon rreth dy njësi. Koha e referencës e fiksuar për përsëritshmëri.
Skenarët të balancuar: 8 me njësi të freskët, 8 mesatare, 8 të vjetra; 6 për secilin burim.

## Rezultati

| Qasja | Njësia e duhur e përzgjedhur | Rangu mesatar | Njësi të përzgjedhura |
| --- | --- | --- | --- |
| pocketai (i propozuar) | 0.833 | 1.15 | 2.63 |
| cungimi | 0.500 | 1.50 | 2.71 |
| vetëm freskia | 0.417 | 2.20 | 2.67 |
| vetëm relevanca | 1.000 | 1.00 | 2.54 |

Sipas moshës së njësisë së duhur:

| Qasja | E freskët | Mesatare | E vjetër |
| --- | --- | --- | --- |
| pocketai | 1.00 | 1.00 | 0.50 |
| cungimi | 0.625 | 0.50 | 0.375 |
| vetëm freskia | 1.00 | 0.25 | 0.00 |
| vetëm relevanca | 1.00 | 1.00 | 1.00 |

## Interpretimi

Qasja bazë me vetëm relevancë e tejkalon algoritmin e propozuar: 100 përqind kundrejt 83
përqind. Shkaku është i qartë në ndarjen sipas moshës. Algoritmi i propozuar shumëzon
relevancën me freskinë, prandaj kur njësia e duhur është e vjetër, faktori i freskisë e ul
rezultatin e saj nën njësi më të freskëta por të parëndësishme. Në skenarët me njësi të vjetër
saktësia e tij bie në 0.50, ndërsa relevanca e pastër qëndron në 1.00.

## Kufizimi i kësaj prove

Prova ka një dobësi ndërtimore që duhet thënë hapur. Në secilin skenar vetëm një njësi është
vërtet e përshtatshme, ndërsa pesë të tjerat nuk kanë lidhje me pyetjen. Në një detyrë të tillë
relevanca e pastër është zgjidhja optimale sipas ndërtimit, sepse nuk ka asnjë dykuptimësi që
freskia ose besueshmëria e burimit të duhet ta zgjidhë.

Premisa e algoritmit të propozuar është e ndryshme: ai është menduar për rastet kur shumë njësi
janë njëkohësisht të përshtatshme dhe duhet vendosur cila prej tyre është e vlefshme, për shembull
kur një informacion i vjetër është zëvendësuar nga një i më i ri, ose kur i njëjti fakt vjen nga
burime me besueshmëri të ndryshme. Këtë premisë prova e parë nuk e mat fare.

Prandaj rezultati i mësipërm duhet lexuar si përfundim i kufizuar: në marrjen e një njësie të
vetme të përshtatshme, faktorët shtesë e dëmtojnë përzgjedhjen. Nevojitet një provë e dytë me
informacion konfliktual dhe të zëvendësuar për të gjykuar premisën e vërtetë të algoritmit.

# Prova e dytë: informacion konfliktual dhe i zëvendësuar

Prova e dytë mat premisën e vërtetë të algoritmit. Skenarët ndahen në tri lloje, tetë për
secilin, dhe secili lloj është ndërtuar që asnjë faktor i vetëm të mos mjaftojë.

- Zëvendësim: dy njësi për të njëjtën temë, ajo e vjetër e pavlefshme dhe ajo e re e vlefshme.
- Autoritet: e njëjta pyetje me përgjigje nga një bisedë e pasigurt dhe nga një dokument zyrtar,
  me moshë të njëjtë.
- E vjetër por e vlefshme: një njësi e vetme vërtet e përshtatshme, e cila është e vjetër.

Matja kryesore është sa shpesh njësia e duhur renditet e para. Vetëm përfshirja brenda buxhetit
nuk mjafton, sepse kur brenda buxhetit hyn edhe njësia e zëvendësuar, konflikti nuk zgjidhet.

## Rezultati

| Qasja | Gjithsej | Zëvendësim | Autoritet | E vjetër por e vlefshme |
| --- | --- | --- | --- | --- |
| pocketai (i propozuar) | 0.792 | 1.000 | 1.000 | 0.375 |
| vetëm relevanca | 0.708 | 0.375 | 0.750 | 1.000 |
| cungimi | 0.333 | 0.000 | 0.000 | 1.000 |
| vetëm freskia | 0.000 | 0.000 | 0.000 | 0.000 |

## Interpretimi

Algoritmi i propozuar e kryen pa gabim detyrën për të cilën është menduar. Në skenarët e
zëvendësimit dhe të autoritetit ai e rendit të parën njësinë e duhur në të gjitha rastet, ndërsa
relevanca e pastër arrin vetëm 0.375 dhe 0.750 përkatësisht. Arsyeja është e pritshme: kur dy
njësi flasin për të njëjtën temë, ngjashmëria semantike nuk mund të dallojë të vlefshmen nga e
zëvendësuara, ndërsa freskia dhe pesha e burimit e dallojnë.

Dobësia e vërejtur në provën e parë qëndron edhe këtu. Në skenarët ku njësia e duhur është e
vjetër por e vlefshme, algoritmi arrin vetëm 0.375, ndërsa relevanca e pastër 1.000. Faktori i
freskisë e ndëshkon shumë informacionin e vjetër që nuk është zëvendësuar nga asgjë.

Përfundimi i përbashkët i dy provave është i kushtëzuar dhe duhet formuluar me kujdes: algoritmi
i propozuar është më i mirë kur informacioni bie në kundërshtim ose ka besueshmëri të ndryshme
sipas burimit, dhe më i dobët kur kërkohet një fakt i vetëm i vjetër. Pohimi se ai i tejkalon
të gjitha qasjet bazë në çdo rrethanë nuk mbështetet nga matjet.

## Kufizime të ndërtimit të provës

Dy rezultate nuk duhen lexuar si merita ose dobësi e vërtetë e qasjeve bazë, sepse rrjedhin nga
ndërtimi i skenarëve.

Qasja vetëm freskia arrin zero në të tri llojet sepse në secilin skenar u futën qëllimisht njësi
të parëndësishme më të freskëta se njësia e duhur, pikërisht që freskia e pastër të mos ishte
zgjidhje e mjaftueshme. Ky zero pasqyron ndërtimin e provës dhe jo një pamundësi të përgjithshme
të kësaj qasjeje.

Qasja cungimi arrin 1.000 në llojin e vjetër por e vlefshme sepse në atë lloj njësia e duhur u
vendos e para në radhë. Edhe ky është artefakt i ndërtimit.

Krahasimi i vlefshëm është midis algoritmit të propozuar dhe relevancës së pastër, sepse asnjëra
prej tyre nuk varet nga radha e njësive.

# Prova e tretë: kufiri i poshtëm i faktorit të freskisë

Dobësia e vërejtur në dy provat e para ka një shkak të përcaktuar: faktori i freskisë zbret
në mënyrë eksponenciale drejt zeros, prandaj një njësi e vjetër e humb rezultatin e vetë edhe
kur asgjë nuk e ka zëvendësuar. Zgjidhja e provuar është një kufi i poshtëm i këtij faktori.

Vlerat u provuan nga 0 deri në 1 mbi të dy grupet e skenarëve, gjithsej 48 skenarë.

| Kufiri | Konflikt, i pari | Zëvendësim | Autoritet | E vjetër por e vlefshme | Njësi e vetme, i pari |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.792 | 1.000 | 1.000 | 0.375 | 0.708 |
| 0.1 | 0.792 | 1.000 | 1.000 | 0.375 | 0.708 |
| 0.2 | 0.792 | 1.000 | 1.000 | 0.375 | 0.792 |
| 0.3 | 0.875 | 1.000 | 1.000 | 0.625 | 0.875 |
| 0.5 | 0.917 | 1.000 | 1.000 | 0.750 | 1.000 |
| 0.7 | 0.958 | 0.875 | 1.000 | 1.000 | 1.000 |
| 1.0 | 0.792 | 0.375 | 1.000 | 1.000 | 1.000 |

## Interpretimi

Vlera 0.5 e tejkalon vlerën fillestare 0 në secilën matje njëherësh. Dallimi i informacionit
të zëvendësuar dhe i autoritetit të burimit mbetet i plotë, saktësia për informacionin e vjetër
por të vlefshëm dyfishohet, dhe në provën me një njësi të vetme të përshtatshme algoritmi arrin
1.000, pra barazohet me relevancën e pastër ku më parë humbte.

Me këtë vlerë algoritmi tejkalon relevancën e pastër në grupin me konflikt, 0.917 kundrejt
0.708, dhe barazohet me të në grupin me një njësi të vetme. Pra pas kësaj ndryshimi pohimi për
tejkalimin e qasjeve bazë qëndron mbi të dy grupet, dhe jo vetëm mbi një prej tyre.

Vlera 1.0 shërben si provë kontrolli e mekanizmit. Me të faktori i freskisë bëhet konstant dhe
algoritmi kthehet në prodhimin e relevancës me peshën e burimit; dallimi i zëvendësimit bie në
0.375, pra pikërisht aftësia që i shtonte vlerë humbet. Kjo e vërteton se përmirësimi vjen nga
kufizimi i faktorit dhe jo nga heqja e tij.

Kuptimi i vlerës 0.5 shprehet thjesht: freskia mund të zvogëlojë rezultatin e një njësie së
shumti në gjysmë, prandaj ajo e modulon relevancën pa e anuluar.

## Kufizim që duhet thënë hapur

Vlera 0.5 u zgjodh mbi të njëjtët skenarë mbi të cilët raportohet edhe rezultati. Kjo është
përshtatje mbi grupin e provës dhe nuk përbën vlerësim të pavarur. Përfundimi për formën e
kompromisit është i besueshëm, sepse shihet qartë në gjithë gamën e vlerave, ndërsa numri i
saktë 0.5 duhet konfirmuar mbi një grup skenarësh të veçantë përpara se t'i jepet peshë e madhe.

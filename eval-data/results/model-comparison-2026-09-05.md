# Rezultate: krahasimi i tre modeleve, iPhone 12 Pro, 5 shtator 2026

Pajisja: iPhone 12 Pro (iPhone13,3), iOS 26.4, 5717 MB RAM.
Metrika e memories: `resident_size` (RSS). `phys_footprint` raportohet vecmas.
Konteksti: 2048 tokena per te tre modelet. Niveli i kuantizimit: Q4_K_M per te tre.
Inferenca reale (jo mock). Te njejtat 6 pyetje, 3 perseritje per pyetje.

Qellimi i ketij grupi matjesh eshte krahasimi i modeleve me madhesi te ndryshme ne te njejtin
nivel kuantizimi, ne dallim nga kurba e kuantizimit e matur me pare mbi Llama 3.2 1B.

## Gjurma e memories (proces i paster per cdo matje)

| Modeli | Skedari | RSS | Mbi skedarin | Koha e ngarkimit | phys_footprint |
| --- | --- | --- | --- | --- | --- |
| Llama 3.2 1B Q4 | 770 MB | 922 MB | 152 MB | 4.7 s | e paraportuar |
| Llama 3.2 3B Q4 | 1926 MB | 2248 dhe 2295 MB | 117 dhe 280 MB | 9.8 dhe 10.1 s | 459 dhe 475 MB |
| Phi-3 Mini Q4 | 2282 MB | 3013 deri 3135 MB | 525 deri 645 MB | 10.3 deri 11.8 s | 966 MB |

Matjet per Phi-3 Mini jane kater, per Llama 3.2 3B jane dy dhe per Llama 3.2 1B eshte marre
mesorja e fushates se meparshme.

### Shtesa mbi madhesine e skedarit nuk eshte konstante

Ne fushaten e kuantizimit mbi Llama 3.2 1B shtesa mbi skedarin dukej afersisht konstante, rreth
151 MB, dhe u shpjegua me cache-in KV dhe buferat e llogaritjes qe varen nga dritarja e kontekstit.
Matjet e reja e perjashtojne kete pergjithesim. Me te njejten dritare konteksti prej 2048 tokenash,
Phi-3 Mini shton midis 525 dhe 645 MB, pra rreth kater here me shume se Llama 3.2 1B.

Shpjegimi qendron te arkitektura. Phi-3 Mini ka rreth 3.8 miliarde parametra dhe nje dimension te
brendshem me te gjere se Llama 3.2, prandaj cache-i KV per te njejten gjatesi konteksti eshte
dukshem me i madh. Perfundimi praktik eshte se planifikimi i memories ne pajisje nuk mund te
mbeshtetet vetem te madhesia e skedarit GGUF. Dy modele me skedare afersisht te njejte mund te
kerkojne qindra megabajt te ndryshem ne ekzekutim.

Per Llama 3.2 3B shtesa e matur ndryshoi midis dy matjeve, 117 dhe 280 MB. Kjo pasiguri perputhet
me dukurine e dymodalitetit te vezhguar edhe me pare mbi Llama 3.2 1B dhe mbetet e pashpjeguar.

## Shpejtesia e gjenerimit

| Modeli | n | Mesatarja | Devijimi standard | Mediana | Min | Max | Kohe mediane |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Llama 3.2 1B Q4 | 18 | 21.60 | 7.70 | 23.56 | 4.39 | 34.21 | 2193 ms |
| Llama 3.2 3B Q4 | 17 | 7.11 | 2.16 | 8.08 | 2.96 | 9.40 | 9465 ms |
| Phi-3 Mini Q4 | 18 | 5.07 | 1.20 | 5.28 | 2.74 | 6.65 | 12414 ms |

Njesia eshte tokena ne sekonde.

Kalimi nga 1 miliard ne 3 miliarde parametra e ul shpejtesine rreth tre here, ndersa Phi-3 Mini me
rreth 3.8 miliarde parametra eshte edhe rreth 29 perqind me i ngadalshem se Llama 3.2 3B. Renia nuk
eshte thjesht proporcionale me numrin e parametrave dhe varet edhe nga arkitektura.

Devijimi standard zvogelohet me rritjen e modelit. Per Llama 3.2 1B Q4 ai eshte 7.70 dhe per
Phi-3 Mini vetem 1.20. Te modelet e vogla koha e nje pergjigjeje eshte aq e shkurter sa ndryshimet
midis pyetjeve dhe nxehja e pajisjes peshojne me shume ne rezultat.

## Kufizime

Matja e Llama 3.2 3B ka 17 ekzekutime ne vend te 18, sepse fushata u nderpre para perfundimit dhe
nje qelize pyetje-perseritje mbeti pa u matur. Kjo nuk e ndryshon mesataren ne menyre te dukshme.

Matjet e memories per Llama 3.2 3B jane vetem dy, jo tre si per modelet e tjera.

Te tre modelet u matur ne te njejten pajisje dhe me te njejten dritare konteksti, por jo ne te
njejten dite me kurben e kuantizimit te Llama 3.2 1B.

## Vezhgim mbi kufirin praktik te pajisjes

Phi-3 Mini Q4 arrin RSS rreth 3.1 GB dhe pas ngarkimit i mbeten pajisjes rreth 2.1 GB te lira.
Modeli u ngarkua me sukses ne kater nga pese perpjekje. Nje perpjekje deshtoi me gabimin
"Failed to load the model" nga llama.rn, gje qe tregon se ky model qendron afer kufirit praktik te
memories se disponueshme per nje aplikacion ne kete pajisje.

## Skedaret e te dhenave

- `iphone12pro-runs-raw.csv` permban te 125 ekzekutimet.
- `pocketai-iphone12pro-2026-09-05.db` eshte kopja e bazes se te dhenave te pajisjes.

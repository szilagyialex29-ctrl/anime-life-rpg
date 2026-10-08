# Mozgó karakteres 3D játék

## Cél
A jelenlegi gombnyomásos kapuharc helyett egy valóban játszható 3D pálya készül, ahol ugyanazt a karaktert három nézetben lehet irányítani:

- **LoL-szerű felülnézet:** kattintásos mozgás, célkijelölés és képességek.
- **Akció-RPG nézet:** WASD mozgás, követő kamera, támadás és kitérés.
- **Platform nézet:** oldalnézet, futás és ugrás ugyanazon küldetés külön szakaszán.

Az első teljes pálya egy küldetéses kapu lesz, amely kisebb ellenfelek és célok után boss-harccal zárul.

## Megvalósítás
1. Új teljes képernyős játéknézet készül, amely a meglévő Kapuk részből indítható, majd visszaenged a trackerhez.
2. Közös 3D karakter-, kamera-, irányítás- és harcrendszer készül, nézetenként eltérő vezérléssel.
3. A pálya céljai: kapu aktiválása, tárgyak összegyűjtése, kisebb ellenfelek legyőzése, majd a boss megölése.
4. A játékos életereje, manája, sebzése és jutalma a már meglévő szintből és statisztikákból származik.
5. Győzelemkor megmarad az XP és az árnyékkinyerés; vereségnél újraindítható a pálya.
6. Asztali és érintős irányítás, szünet, küldetésjelző, boss-életerő és nézetváltó kerül a képernyőre.
7. A karakterhez és ellenfelekhez jogtisztán letölthető, helyben tárolt 3D modelleket használunk; ha megfelelő ingyenes modell nem elérhető, stilizált saját 3D formát használunk, nem törött külső hivatkozást.

## Technikai részletek
- React Three Fiber alapú, kliensoldali 3D nézet.
- Képkockasebességtől független mozgás és ütközés.
- Egy közös játékmenet-állapot kezeli mindhárom kameramódot, a HUD-ot és a jutalmakat.
- A jelenlegi körökre osztott harc megmarad tartalék egyszerű módként, amíg az új 3D pálya töltődik vagy nem támogatott az eszközön.
- Böngészős ellenőrzés készül mozgásra, harcra, nézetváltásra, győzelemre és mobil méretre.

## 3D AI ajánlás
A készítés során ellenőrzöm a jelenleg ténylegesen exportálható lehetőségeket. Elsőként a **Tripo AI** és **Meshy** aktuális ingyenes exportját vizsgálom; fizetős fal esetén a **Kenney** és **Quaternius** ingyenes, jogtiszta modellcsomagjai jelentik a biztos alternatívát.

import warrior from "@/assets/warrior.jpg";
import mage from "@/assets/mage.jpg";
import wanderer from "@/assets/wanderer.jpg";

export type Stat = "STR" | "CHA" | "INT" | "HP" | "MANA";
export type ClassId = "warrior" | "mage" | "wanderer";
export const CLASSES: Record<ClassId, { name: string; img: string; bonus: Stat; desc: string }> = {
  warrior: { name: "Harcos", img: warrior, bonus: "STR", desc: "+20% XP edzésre" },
  mage: { name: "Mágus", img: mage, bonus: "INT", desc: "+20% XP tanulásra" },
  wanderer: { name: "Vándor", img: wanderer, bonus: "CHA", desc: "+20% XP stílusra" },
};
export const QUESTS: { id: string; label: string; stat: Stat; xp: number }[] = [
  { id: "pushups", label: "50 fekvőtámasz", stat: "STR", xp: 30 },
  { id: "run", label: "20 perc futás / séta", stat: "STR", xp: 30 },
  { id: "skin", label: "Esti bőrápolási rutin", stat: "CHA", xp: 20 },
  { id: "outfit", label: "Átgondolt outfit ma", stat: "CHA", xp: 15 },
  { id: "study", label: "45 perc fókuszált tanulás", stat: "INT", xp: 30 },
  { id: "sleep", label: "7+ óra alvás", stat: "HP", xp: 25 },
  { id: "water", label: "2 liter víz", stat: "MANA", xp: 20 },
];
export const PENALTY = [
  { id: "p1", label: "150 fekvőtámasz + 100 guggolás", stat: "STR" as Stat, xp: 10 },
  { id: "p2", label: "10 km gyaloglás", stat: "HP" as Stat, xp: 10 },
  { id: "p3", label: "2 óra tanulás telefon nélkül", stat: "INT" as Stat, xp: 10 },
];
export const DARES = [
  "Táncold el a legcikibb trendet a nappaliban, és posztold.",
  "Énekelj el egy Disney-dalt teljes átéléssel, kamerába.",
  "Mondd el drámai anime-monológban, miért hagytad ki a küldetést.",
  "Csinálj 'reggeli rutin' videót mint egy túlbuzgó influenszer.",
];
export type MentorId = "jinwoo" | "chahaein" | "jinho" | "gunhee" | "yoonho" | "jinchul";
export const MENTORS: Record<MentorId, { name: string; title: string; done: string[]; idle: string[]; levelup: string[] }> = {
  jinwoo: {
    name: "Sung Jin-Woo",
    title: "A Rendszer hangja",
    done: ["Kelj fel. A munkád még nem vége.", "Elfogadva. Folytasd.", "Ez még nem monarchia-szintű teljesítmény. De közel."],
    idle: ["Arise... az ágyadból.", "Az árnyékaid is türelmesebbek nálad.", "A kapuk nem várnak. Te meg vártatsz."],
    levelup: ["SZINTLÉPÉS. A Rendszer elismeri. Ne bízd el magad.", "Erősödsz. Jó. Lesz még mit oltalmaznod."],
  },
  chahaein: {
    name: "Cha Hae-In",
    title: "S-rangú kardtáncos",
    done: ["Megéreztem: ma is gyűjtöd az erőt.", "Szép munka. Több dícséretet majd a következő szintnél.", "Látom a szorgalmat. Tartsd meg."],
    idle: ["A kardom azt súgja: mozdulj.", "Illat alapján is kiderül, hogy ma nem edzettél.", "Egy S-rangú vadász is naponta edz. És te?"],
    levelup: ["Erősebb lettél. Ezt a levegőben is érzem.", "Új szint. Megérdemelted – ne duzzadj azonnal."],
  },
  jinho: {
    name: "Yoo Jin-Ho",
    title: "A leghűségesebb haver",
    done: ["Nagykönyv, főnök! Ezt kinyomtatjuk!", "Látod? Ez már szinte S-rangú mozdulat!", "Haver leszel belőlem, főnök, emlékezz a szavamra!"],
    idle: ["Főnök, ha mozdulnánk is egy kicsit?", "Ha a guildem büntetné a kifogásokat, most a sarokban ülnél.", "Ne szomorkodj, főnök. Együtt gyengék, együtt erősek!"],
    levelup: ["SZINTLÉPÉS!! Főnök, ki vagy te, egy másik személy vagy már?!", "Rangemelés! Majd szobrot állítok, szinte kész is!"],
  },
  gunhee: {
    name: "Go Gun-Hee",
    title: "A Szövetség elnöke",
    done: ["Fegyelmezett. Ez a legnagyobb erény.", "Lassú léptekkel is fel lehet érni, ha naponta léptek.", "Jó. Az ilyen apróságokból lesz a rang."],
    idle: ["Ifjú, a szorgalom sokszor felülmúlja a tehetséget.", "Ülj le magaddal: kifogás vagy fejlődés?", "A korom nem engedi, különben helyetted edzenék."],
    levelup: ["Fejlődsz. Elnöki elismerésben részesültél.", "Szintet léptél. Emlékezz: az erő akkor ér valamit, ha oltalmaz."],
  },
  yoonho: {
    name: "Baek Yoon-Ho",
    title: "A Vörös Sarkány vezetője",
    done: ["Hah! Csak így! Még százat!", "Nem rossz. De lehetne vadabb is!", "Ilyen tempóban tényleg lesz belőled vadász."],
    idle: ["Szunnyadsz? A mancsaid nem díszek!", "Szedd össze magad! A vadászok nem a kanapén születnek!", "Ha így folytatod, majd beszipáblázlak magadnak az edzőterembe!"],
    levelup: ["GYAKORLOD! Ezt kellett! Még erősebben!", "Új szint! Mostantól még keményebben edzek veled!"],
  },
  jinchul: {
    name: "Woo Jin-Chul",
    title: "Felügyelő, Szövetség",
    done: ["Rögzítve. Megfelelő teljesítmény.", "Jelentés elfogadva. Folytassa.", "Az adatok szerint fejleszted magad. Jó jel."],
    idle: ["Emlékeztető: a napi küldetések határideje közeleg.", "Az Ön jelentkezése eddig elmaradt. Javítsa.", "A Szövetség figyeli a fejlődését. Vagy színlel. Nem mindegy."],
    levelup: ["Szintlépés visszaigazolva. Hivatalból is gratulálok.", "Rangemelés rögzítve. Tartsa a színvonalat."],
  },
};

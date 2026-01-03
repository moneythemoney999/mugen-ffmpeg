import os from "os";
import fs from "fs";
import path from "path";
import https from "https";
import { execSync } from "child_process";

console.log("mugen-ffmpeg en cours d'installation...\n");

/* =========================
   Détection de l'environnement
========================= */
const plateforme = os.platform();
const architecture = os.arch();

console.log("Détection de l'OS en cours...");
console.log(` → OS détecté : ${plateforme}\n`);

console.log("Détection de l'architecture en cours...");
console.log(` → Architecture détectée : ${architecture}\n`);

/* =========================
   Sources FFmpeg statiques
========================= */
const sourcesFFmpeg = {
  "linux-arm64":
    "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz",
  "linux-x64":
    "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
};

const clePlateforme = `${plateforme}-${architecture}`;

if (!sourcesFFmpeg[clePlateforme]) {
  console.error("Plateforme non supportée :", clePlateforme);
  process.exit(1);
}

const urlFFmpeg = sourcesFFmpeg[clePlateforme];

/* =========================
   Chemins
========================= */
const racinePackage = process.cwd();
const dossierBinLocal = path.join(racinePackage, "bin");
const cheminFinalLocal = path.join(dossierBinLocal, "mugen_ffmpeg");

const dossierCache = path.join(os.homedir(), ".cache", "mugen-ffmpeg", clePlateforme);
const cheminCache = path.join(dossierCache, "mugen_ffmpeg");

const archive = path.join(dossierBinLocal, "ffmpeg.tar.xz");

/* =========================
   Préparation des dossiers
========================= */
fs.mkdirSync(dossierBinLocal, { recursive: true });

/* =========================
   1️⃣ Vérification cache
========================= */
if (fs.existsSync(cheminCache)) {
  console.log("mugen-ffmpeg déjà téléchargé depuis le cache.");

  fs.copyFileSync(cheminCache, cheminFinalLocal);
  fs.chmodSync(cheminFinalLocal, 0o755);

  fs.writeFileSync(
    path.join(racinePackage, "ffmpeg-path.json"),
    JSON.stringify(
      {
        chemin: cheminFinalLocal,
        plateforme,
        architecture,
        source: "cache"
      },
      null,
      2
    )
  );

  console.log("FFmpeg prêt :", cheminFinalLocal);
  process.exit(0);
}

/* =========================
   2️⃣ Téléchargement
========================= */
console.log("Téléchargement en cours...\n");

https.get(urlFFmpeg, (res) => {
  if (res.statusCode !== 200) {
    console.error("Échec du téléchargement :", res.statusCode);
    process.exit(1);
  }

  const total = parseInt(res.headers['content-length'] || "0");
  let téléchargé = 0;

  const fichier = fs.createWriteStream(archive);
  res.on("data", (chunk) => {
    téléchargé += chunk.length;
    if (total) {
      const pourcentage = ((téléchargé / total) * 100).toFixed(1);
      process.stdout.write(`\rTéléchargé: ${pourcentage}%`);
    }
  });

  res.pipe(fichier);

  fichier.on("finish", () => {
    fichier.close();
    console.log("\nTéléchargement terminé.\n");
    console.log("Extraction en cours...\n");

    /* =========================
       3️⃣ Extraction
    ========================= */
    execSync(`tar -xf "${archive}" -C "${dossierBinLocal}"`);

    const dossierExtrait = fs
      .readdirSync(dossierBinLocal)
      .find((d) => d.startsWith("ffmpeg-"));

    if (!dossierExtrait) {
      console.error("Dossier FFmpeg introuvable après extraction.");
      process.exit(1);
    }

    const ffmpegExtrait = path.join(dossierBinLocal, dossierExtrait, "ffmpeg");

    /* =========================
       4️⃣ Installation locale
    ========================= */
    fs.copyFileSync(ffmpegExtrait, cheminFinalLocal);
    fs.chmodSync(cheminFinalLocal, 0o755);

    /* =========================
       5️⃣ Cache global
    ========================= */
    fs.mkdirSync(dossierCache, { recursive: true });
    fs.copyFileSync(ffmpegExtrait, cheminCache);
    fs.chmodSync(cheminCache, 0o755);

    /* =========================
       6️⃣ Nettoyage
    ========================= */
    fs.rmSync(path.join(dossierBinLocal, dossierExtrait), { recursive: true, force: true });
    fs.unlinkSync(archive);

    /* =========================
       7️⃣ Sauvegarde chemin
    ========================= */
    fs.writeFileSync(
      path.join(racinePackage, "ffmpeg-path.json"),
      JSON.stringify(
        {
          chemin: cheminFinalLocal,
          plateforme,
          architecture,
          source: "download"
        },
        null,
        2
      )
    );

    console.log("FFmpeg prêt :", cheminFinalLocal);
  });
});

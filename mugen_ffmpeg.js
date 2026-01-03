import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fichierChemin = path.join(__dirname, "ffmpeg-path.json");

let cheminFFmpeg = null;

if (fs.existsSync(fichierChemin)) {
  const contenu = JSON.parse(fs.readFileSync(fichierChemin, "utf-8"));
  cheminFFmpeg = contenu.chemin; // ← ici, correspond à ton JSON
}

export { cheminFFmpeg };

export default {
  cheminFFmpeg
};

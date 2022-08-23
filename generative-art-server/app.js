import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import handleBarsExpress from "express-handlebars";
import path from "path";

import { getScript } from "./controllers/sketches.js";
import { saveImage } from "./controllers/images.js";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

const app = express();
const port = process.env.PORT || 8000;

const handleBars = handleBarsExpress.create({
  layoutsDir: path.dirname(".") + "/views/layouts",
  extname: "hbs",
  defaultLayout: "index",
});

app.engine("hbs", handleBars.engine);
app.set("view engine", "hbs");

app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors());
app.use(express.static("public"));

const tokenImages = {};

app.get("/token/:tokenId", async (req, res) => {
  const hash = await getScript(req.params.tokenId);

  if (!tokenImages[`img_${req.params.tokenId}`]) {
    const buf = saveImage(hash, req.params.tokenId);

    // Configure this to the network you deployed your contract to;
    const sdk = new ThirdwebSDK("goerli");

    const result = await sdk.storage.upload(buf);

    tokenImages[`img_${req.params.tokenId}`] = `${result.uris[0]}`;
  }

  res.render("piece", {
    scriptName: `mySketch.js`,
  });
});

app.get("*", (req, res) => {
  res.status(404).send("Not found");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

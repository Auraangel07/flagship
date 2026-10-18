import { env } from "./env";
import { app } from "./app";

app.listen(env.PORT, () => console.log(`Flagship API on :${env.PORT}`));
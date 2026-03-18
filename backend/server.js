const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const { app } = require("./src/app");

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
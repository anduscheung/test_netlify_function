import express, { Router } from "express";
import serverless from "serverless-http";
import Airtable from "airtable";
import bodyParser from "body-parser";

const api = express();
api.use(bodyParser.json());

Airtable.configure({
  apiKey: process.env.AIR_TABLE_API_KEY,
});
const base = Airtable.base(process.env.AIR_TABLE_BASE_ID);
const table = base(process.env.AIR_TABLE_TABLE_ID);

const router = Router();

router.get("/hello", (req, res) => {
  res.send("Hello World!");
});

router.post("/hello", (req, res) => {
  res.send("Hello Post!");
});

router.post("users/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) throw new Error();
    const users = await table
      .select({ maxRecords: 1, filterByFormula: `{Name} = '${username}'` })
      .firstPage();

    if (users.length > 0 && users[0].fields.Password === password) {
      res.status(200).send("ok");
    } else {
      throw new Error();
    }
  } catch (e) {
    res.status(401).send("Incorrect username or password");
  }
});

const passwordRegex =
  /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?])(?=.*[0-9a-zA-Z]).{8,}$/;
router.post("/users/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  try {
    if (!username || !oldPassword || !newPassword) {
      throw new Error("Missing fields");
    }

    // Password validation: At least one capital letter, one special character, one number or letter, and minimum 8 characters
    if (!passwordRegex.test(newPassword)) {
      return res
        .status(400)
        .send(
          "Password must contain at least one capital letter, one special character, and be at least 8 characters long"
        );
    }

    const users = await table
      .select({ maxRecords: 1, filterByFormula: `{Name} = '${username}'` })
      .firstPage();

    if (users.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = users[0];
    if (user.fields.Password !== oldPassword) {
      return res.status(401).send("Incorrect current password");
    }

    await table.update(user.id, {
      Password: newPassword,
    });

    res.status(200).send("Password changed successfully");
  } catch (e) {
    res.status(500).send(e.message || "An error occurred");
  }
});

api.use("/api/", router);

export const handler = serverless(api);

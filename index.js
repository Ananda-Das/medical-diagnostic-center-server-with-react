const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

//middlewares
const verifyToken = (req, res, next) => {
  // console.log(req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "forbidden access" });
  }
  const token = req.headers.authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qfsxze0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    //collections Names
    const userCollection = client.db("DiagnosticDB").collection("users");
    const testCollection = client.db("DiagnosticDB").collection("tests");
    const bannerCollection = client.db("DiagnosticDB").collection("banners");
    const bookingCollection = client.db("DiagnosticDB").collection("bookings");
    const paymentCollection = client.db("DiagnosticDB").collection("payments");
    const recomendationCollection = client.db("DiagnosticDB").collection("recomendations");

    //use verify Admin after verify Token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "1h" });
      res.send({ token });
    });

    //users related api

    //check user is Admin or Not
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    //get all the user
    app.get("/users", verifyToken, async (req, res) => {
      // console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //get a user info
    app.get("/user/:email", verifyToken, async (req, res) => {
      const result = await userCollection.findOne({ email: req.params.email });
      res.send(result);
    });

    //get a banner info
    app.get("/banners/:email", verifyToken, async (req, res) => {
      const result = await bannerCollection.findOne({ isActive: req.params.isActive });
      res.send(result);
    });

    //gat a specific user info
    app.get("/single/user/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.send({ message: error.message });
      }
    });

    //gat a single user info
    app.get("/singleUser/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.send({ message: error.message });
      }
    });

    //post users
    app.post("/users", async (req, res) => {
      const user = req.body;
      //insert email if user doesn't exists:
      // const query = { email: user.email };
      // const existingUser = await userCollection.findOne(query);
      // if (existingUser) {
      //   return res.send({ message: "user already exists", insertedId: null });
      // }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //make admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //toggle user status
    app.patch("/user/toggle/:id/:status", async (req, res) => {
      const id = req.params.id;
      const status = req.params.status;
      console.log(status);
      const filter = { _id: new ObjectId(id) };

      if (status === "Active") {
        status === "Block";
        console.log("after check", status);
      } else {
        status === "Active";
        console.log("after block check", status);
      }

      const updatedDoc = {};
      // const result = await userCollection.updateOne(filter);
      // res.send(result);
    });

    //delete user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // Update user status
    app.patch("/change/user/:id", async (req, res) => {
      const userId = req.params.id;

      try {
        const filter = { _id: new ObjectId(userId) };
        const user = await userCollection.findOne(filter);

        if (!user) {
          return res.status(404).json({ error: "Banner not found" });
        }

        const updatedDoc = {
          $set: {
            status: !user.status,
          },
        };

        const result = await userCollection.updateOne(filter, updatedDoc);

        res.json({ message: "Banner updated successfully", result });
      } catch (error) {
        console.error("Error updating banner:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // ====================================== Test Related API ===========================================

    //Add a test
    app.post("/add/test", verifyToken, async (req, res) => {
      const test = req.body;
      const result = await testCollection.insertOne(test);
      res.send(result);
    });

    //get all the tests
    // app.get("/tests", verifyToken, async (req, res) => {
    //   const result = await testCollection.find().toArray();
    //   res.send(result);
    // });
    app.get("/tests", async (req, res) => {
      const result = await testCollection.find().toArray();
      res.send(result);
    });

    //get a specific test
    app.get("/test/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.findOne(query);
      res.send(result);
    });

    //update a test
    app.patch("/test/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          date: item.date,
          details: item.details,
          price: item.price,
          slot: item.slot,
          imageUrl: item.imageUrl,
        },
      };

      const result = await testCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //delete test
    app.delete("/test/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await testCollection.deleteOne(query);
      res.send(result);
    });

    // ====================================== Banner Related API ===========================================
    //Add a banner
    app.post("/add/banner", async (req, res) => {
      const banner = req.body;
      const result = await bannerCollection.insertOne(banner);
      res.send(result);
    });

    //get all the banners
    app.get("/banners", async (req, res) => {
      const result = await bannerCollection.find().toArray();
      res.send(result);
    });

    //delete banner
    app.delete("/banner/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bannerCollection.deleteOne(query);
      res.send(result);
    });

    //get all a specific banner
    app.get("/banners/:discount", verifyToken, async (req, res) => {
      const result = await bannerCollection.findOne({ couponCodeName: req.params.discount });
      res.send(result);
    });

    // Update isActive status
    app.patch("/banners/:id", async (req, res) => {
      const bannerId = req.params.id;

      try {
        const filter = { _id: new ObjectId(bannerId) };
        const banner = await bannerCollection.findOne(filter);

        if (!banner) {
          return res.status(404).json({ error: "Banner not found" });
        }

        const updatedDoc = {
          $set: {
            isActive: !banner.isActive,
          },
        };

        const result = await bannerCollection.updateOne(filter, updatedDoc);

        res.json({ message: "Banner updated successfully", result });
      } catch (error) {
        console.error("Error updating banner:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    //get all a specific banner
    app.get("/banners/:isActive", async (req, res) => {
      const result = await bannerCollection.findOne({ isActive: req.params.isActive });
      res.send(result);
    });

    // ====================================== Guest User Related API ===========================================

    //get a specific user
    // app.get("/user/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await userCollection.findOne(query);
    //   console.log(result);
    //   // res.send(result);
    // });
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // ====================================== Booking Related API ===========================================
    //Add a booking
    app.post("/add/booking", async (req, res) => {
      const banner = req.body;
      const result = await bookingCollection.insertOne(banner);
      res.send(result);
    });

    //get bookings for a specific test
    app.get("/bookedTest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.find(query);
      res.send(result);
    });

    // ====================================== Payment Related API ===========================================
    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount inside the intent");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      console.log("payment info", payment);

      res.send({ paymentResult });
    });

    //update the test slot after payments
    app.patch("/updateTest/:id", async (req, res) => {
      const testId = req.params.id;

      try {
        const filter = { _id: new ObjectId(testId) };
        const banner = await testCollection.findOne(filter);

        const updatedDoc = {
          $set: {
            slot: -1,
          },
        };

        const result = await testCollection.updateOne(filter, updatedDoc);

        res.json({ message: "Test updated successfully", result });
      } catch (error) {
        console.error("Error updating Test:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    //get all payments
    app.get("/payments", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    //delete payments
    app.delete("/payments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.deleteOne(query);
      res.send(result);
    });

    //get a specific payments
    app.get("/single/payments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.findOne(query);
      res.send(result);
    });

    //update a payments
    app.patch("/payments/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: item.status,
          testLink: item.testLink,
        },
      };

      const result = await paymentCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // ====================================== MY Bookings Related API ===========================================
    //get specifice a user Booked Test
    app.get("/my/booked/test", verifyToken, async (req, res) => {
      // console.log('applied', req.user);
      // if (req.query.email !== req.user.email) {
      //   return res.status(403).send({ message: "Forbiden Access" });
      // }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/my/booked/test/details", async (req, res) => {
      // const bookedUser = await paymentCollection.findOne({email: req.params.email});
      const result = await paymentCollection
        .aggregate([
          {
            $addFields: {
              testId: {
                $toObjectId: "$testId",
              },
            },
          },
          {
            $lookup: {
              from: "tests",
              localField: "testId",
              foreignField: "_id",
              as: "testDetails",
            },
          },
        ])
        .toArray();

      res.send(result);
    });

    //get all recomendation
    app.get("/recomendations", async (req, res) => {
      const result = await recomendationCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Medicare is Running!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

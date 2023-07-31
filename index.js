const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// middleware 
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rsztvpo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        const classCollection = client.db("sports").collection("class");
        const cartCollection = client.db("sports").collection("carts");
        const userCollection = client.db("sports").collection("users");
        const paymentCollection = client.db("sports").collection("payments");

        // for class data --------------------------------------------------------------------

        app.get('/class', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })



        // for carts data after clicking enroll it post item to data base--------------------------------------------------------------------
        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(item)
            const result = await cartCollection.insertOne(item);
            res.send(result)
        })

        // for check add to cart data from cart  api + it will show the number of product added-------------
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            if (!email) {
                res.send([]);
            }
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })


        // for delete any item from dashboard -------------
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })



        // for users data --------------------------------------------------------------------

        app.get("/users", async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const oldUser = await userCollection.findOne(query);
            if (oldUser) {
                return res.send({ message: "user already exist" });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log(
        //   "Pinged your deployment. You successfully connected to MongoDB!"
        // );
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Sports academy server is running");
});

app.listen(port, () => {
    console.log(`The server is running on port ${port}`);
});

const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;
require("dotenv").config();

// middleware 
app.use(cors());
app.use(express.json());

/// verification
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    // console.log("Authorization = ", authorization);
    if (!authorization) {
        return res
            .status(401)
            .send({ error: true, message: "unauthorized access" });
    }
    const token = authorization.split(" ")[1];

    jwt.verify(token, process.env.Access_Token_Secret, (err, decoded) => {
        if (err) {
            return res.status(403).send({ error: true, message: "forbidden access" });
        }
        req.decoded = decoded;
        // console.log({ decoded });
        next();
    });

    // });
};

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

        // for jwt token -------------------------------------------
        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.Access_Token_Secret);
            // console.log(token);
            res.json({ token });
        });

        // secure all user
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== "admin") {
                return res
                    .status(403)
                    .send({ error: true, message: "forbidden access" });
            }
            next();
        };

        // for class data --------------------------------------------------------------------


        app.get("/class", async (req, res) => {
            const { email } = req.query;

            if (email) {
                // getting instructor's classes
                try {
                    const classes = await classCollection.find({ email }).toArray();
                    res.json(classes);
                } catch (error) {
                    console.error("Failed to fetch instructor's classes:", error);
                    res.status(500).send("Failed to fetch instructor's classes");
                }
            } else {
                // getting all classes
                try {
                    const classes = await classCollection.find().toArray();
                    res.json(classes);
                } catch (error) {
                    console.error("Failed to fetch classes:", error);
                    res.status(500).send("Failed to fetch classes");
                }
            }
        });

        // add class
        app.post("/class", verifyJWT, async (req, res) => {
            const newCourse = req.body;
            const result = await classCollection.insertOne(newCourse);
            res.send(result);
        });

        // Update class
        app.patch("/class/approve/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: "approved",
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // denied class
        app.patch("/class/denied/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: "denied",
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // feedback from admin
        app.post("/class/feedback/:id", async (req, res) => {
            const id = req.params.id;
            const { feedback } = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    feedback,
                },
            };
            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        // for carts data after clicking enroll it post item to data base--------------------------------------------------------------------
        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(item)
            const result = await cartCollection.insertOne(item);
            res.send(result)
        })

        // for check add to cart data from cart  api + it will show the number of product added-------------
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            console.log(email);
            if (!email) {
                res.send([]);
            }
            const decodedEmail = req.decoded.email;
            if (decodedEmail !== email) {
                return res
                    .status(403)
                    .send({ error: true, message: "forbidden access" });
            }
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        app.get("/carts/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.findOne(query);
            res.send(result);
        });
        app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        });

        // for delete any item from dashboard -------------
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })



        // for users data --------------------------------------------------------------------

        app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        // where when new user is registered then it is post to data base ---------------------
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


        // for make a user admin -------------------------------
        app.patch("/users/admin/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            console.log(result)
            res.send(result)
        })

        // admin verify
        app.get("/users/admin/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ admin: false });
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === "admin" };
            res.send(result);
        });

        // instructor verify
        app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.send({ instructor: false });
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === "instructor" };
            res.send(result);
        });

        // for make a user instructor -------------------------------
        app.patch("/users/instructor/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            console.log(result)
            res.send(result)
        })

        app.get("/instructor", async (req, res) => {
            const query = { role: "instructor" };
            const instructors = await userCollection.find(query).toArray();
            res.send(instructors);
        });

        // create payment intent
        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            // console.log(price, amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post("/payments", verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const courseIds = payment.courseId;

            // Update the enrolled classes and reduce available seats
            const updateResult = await classCollection.updateMany(
                // { _id: { $in: courseIds.map((id) => new ObjectId(id)) } },
                { _id: new ObjectId(courseIds) },
                { $inc: { studentsEnrolled: 1, availableSeats: -1 } }
            );
            // Delete
            const query = {
                // _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
                _id: new ObjectId(payment.cartItems)

            };
            // console.log(payment.cartItemId);
            const deleteResult = await cartCollection.deleteMany(query);

            res.send({ insertResult, updateResult, deleteResult });
        });



        app.get("/payments", verifyJWT, async (req, res) => {
            const payments = await paymentCollection.find().toArray();
            res.send(payments);
        });
        app.post("/class/enroll", verifyJWT, async (req, res) => {
            const { courseId } = req.body;

            // Update the enrolled classes
            const updateResult = await classCollection.updateMany(
                { _id: { $in: courseId.map((id) => new ObjectId(id)) } },
                { $inc: { studentsEnrolled: 1, availableSeats: -1 } }
            );

            res.send({ updateResult });
        });

        app.get("/adminstats", async (req, res) => {
            const users = await userCollection.estimatedDocumentCount();
            const classData = await classCollection.estimatedDocumentCount();
            const orders = await paymentCollection.estimatedDocumentCount();
            const payments = await paymentCollection.find().toArray();
            const revenue = payments.reduce((sum, payment) => sum + payment.price, 0);
            res.send({ users, classData, orders, revenue });
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

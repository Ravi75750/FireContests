import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const db = mongoose.connection.db;
        const contestsCollection = db.collection("contests");

        const contests = await contestsCollection.find({}).toArray();
        console.log(`Found ${contests.length} contests to check.`);

        for (const contest of contests) {
            if (!contest.participants || contest.participants.length === 0) continue;

            let needsUpdate = false;
            const newParticipants = contest.participants.map((p, index) => {
                // Check if 'p' is already an object with 'userId' (New Schema)
                if (p.userId && p.slotIndex) {
                    return p;
                }

                // If 'p' is an ObjectId (Old Schema)
                // Mongoose might store it as ObjectId or String in raw DB
                // Typically it is ObjectId.
                needsUpdate = true;
                console.log(`Migrating participant for contest ${contest._id}: ${p}`);

                return {
                    userId: p, // keep the original value (ObjectId)
                    slotIndex: index + 1,
                    // Default empty details for migrated users
                    inGameName: "Migrated User",
                    inGameId: "N/A",
                    upiId: "N/A"
                };
            });

            if (needsUpdate) {
                await contestsCollection.updateOne(
                    { _id: contest._id },
                    { $set: { participants: newParticipants } }
                );
                console.log(`Updated Contest ${contest._id}`);
            }
        }

        console.log("Migration Complete.");

    } catch (error) {
        console.error("Migration Error:", error);
    } finally {
        await mongoose.disconnect();
    }
};

migrate();

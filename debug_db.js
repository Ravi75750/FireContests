import mongoose from "mongoose";
import Contest from "./models/Contest.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const contests = await Contest.find({});
        console.log(`Found ${contests.length} contests`);

        if (contests.length > 0) {
            const contest = contests[0];
            console.log("First Contest ID:", contest._id);
            console.log("Participants:", contest.participants);

            // Check manual findById
            const found = await Contest.findById(contest._id);
            console.log("findById Result:", found ? "Found" : "Not Found");
            if (found) {
                console.log("Participants items type:", typeof found.participants[0]);
                console.log("Participant 0:", found.participants[0]);
            }
        }

    } catch (error) {
        console.error("ERROR:", error);
    } finally {
        await mongoose.disconnect();
    }
};

run();

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB, getDB } from "./db.js";
import { ObjectId } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));

await connectDB();
const db = getDB();
const coursesCol = db.collection("courses");
const studentsCol = db.collection("students");

// health check
app.get("/api/health", async (req, res) => {
  res.json({ ok: true });
});

// === Courses CRUD ===
app.get("/api/courses", async (req, res) => {
  const list = await coursesCol.find({}).sort({ title: 1 }).toArray();
  res.json(list);
});

app.get("/api/courses/:id", async (req, res) => {
  const doc = await coursesCol.findOne({ _id: new ObjectId(req.params.id) });
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

app.post("/api/courses", async (req, res) => {
  const { title, code } = req.body;
  if (!title || !code) return res.status(400).json({ error: "title and code are required" });
  const exists = await coursesCol.findOne({ code });
  if (exists) return res.status(409).json({ error: "Course code already exists" });
  const result = await coursesCol.insertOne({ title, code });
  const saved = await coursesCol.findOne({ _id: result.insertedId });
  res.status(201).json(saved);
});

app.put("/api/courses/:id", async (req, res) => {
  const { title, code } = req.body;
  if (!title || !code) return res.status(400).json({ error: "title and code are required" });
  const result = await coursesCol.findOneAndUpdate(
    { _id: new ObjectId(req.params.id) },
    { $set: { title, code } },
    { returnDocument: "after" }
  );
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json(result);
});

app.delete("/api/courses/:id", async (req, res) => {
  const id = req.params.id;
  const result = await coursesCol.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });
  await studentsCol.updateMany({}, { $pull: { registeredCourses: { courseId: id } } });
  res.json({ ok: true });
});

// === Students CRUD ===
app.get("/api/students", async (req, res) => {
  const { name } = req.query;
  const filter = name ? { name: { $regex: name, $options: "i" } } : {};
  const list = await studentsCol.find(filter).sort({ name: 1 }).toArray();
  res.json(list);
});

app.get("/api/students/:id", async (req, res) => {
  const doc = await studentsCol.findOne({ _id: new ObjectId(req.params.id) });
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

app.post("/api/students", async (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const result = await studentsCol.insertOne({ name, email: email || null, registeredCourses: [] });
  const saved = await studentsCol.findOne({ _id: result.insertedId });
  res.status(201).json(saved);
});

app.put("/api/students/:id", async (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const result = await studentsCol.findOneAndUpdate(
    { _id: new ObjectId(req.params.id) },
    { $set: { name, email: email || null } },
    { returnDocument: "after" }
  );
  if (!result) return res.status(404).json({ error: "Not found" });
  res.json(result);
});

app.delete("/api/students/:id", async (req, res) => {
  const result = await studentsCol.deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// === Register / Unregister ===
app.post("/api/students/:id/register", async (req, res) => {
  const studentId = req.params.id;
  const { courseId } = req.body;
  if (!courseId) return res.status(400).json({ error: "courseId is required" });
  const student = await studentsCol.findOne({ _id: new ObjectId(studentId) });
  const course = await coursesCol.findOne({ _id: new ObjectId(courseId) });
  if (!student) return res.status(404).json({ error: "Student not found" });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const already = await studentsCol.findOne({
    _id: new ObjectId(studentId),
    "registeredCourses.courseId": courseId
  });
  if (already) return res.status(409).json({ error: "Already registered" });

  const embedded = {
    courseId: course._id.toString(),
    title: course.title,
    code: course.code,
    registeredAt: new Date().toISOString()
  };

  const updated = await studentsCol.findOneAndUpdate(
    { _id: new ObjectId(studentId) },
    { $push: { registeredCourses: embedded } },
    { returnDocument: "after" }
  );
  res.json(updated);
});

app.post("/api/students/:id/unregister", async (req, res) => {
  const studentId = req.params.id;
  const { courseId } = req.body;
  if (!courseId) return res.status(400).json({ error: "courseId is required" });
  const student = await studentsCol.findOne({ _id: new ObjectId(studentId) });
  if (!student) return res.status(404).json({ error: "Student not found" });
  const updated = await studentsCol.findOneAndUpdate(
    { _id: new ObjectId(studentId) },
    { $pull: { registeredCourses: { courseId } } },
    { returnDocument: "after" }
  );
  res.json(updated);
});

// === Demo seeding ===
app.post("/api/seed", async (req, res) => {
  const courses = [
    { title: "Intro to Programming", code: "CS101" },
    { title: "Data Structures", code: "CS201" },
    { title: "Web Development", code: "WEB101" },
    { title: "Databases", code: "DB101" },
    { title: "Operating Systems", code: "OS201" }
  ];
  const students = [
    { name: "Majd Kassem", email: "majd@example.com", registeredCourses: [] },
    { name: "Maradona", email: "maradona@example.com", registeredCourses: [] },
    { name: "Elon Musk", email: "Elon@example.com", registeredCourses: [] },
    { name: "John doe", email: "jd@example.com", registeredCourses: [] }
  ];
  await coursesCol.deleteMany({});
  await studentsCol.deleteMany({});
  await coursesCol.insertMany(courses);
  await studentsCol.insertMany(students);
  res.json({ ok: true });
});

// ✅ FIX: Express 5 wildcard route
app.get((req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server http://localhost:${port}`));

const API_BASE = "https://schooldashboard1.onrender.com"; 

const coursesTable = document.querySelector("#courses-table tbody");
const studentsTable = document.querySelector("#students-table tbody");
const studentCoursesTable = document.querySelector("#student-courses-table tbody");
const studentSelect = document.getElementById("student-select");

// Toast notifications
function showToast(msg, success = true) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.style.background = success ? "#4CAF50" : "#e95656";
    toast.style.display = "block";
    setTimeout(() => toast.style.display = "none", 2000);
}

// --- Load Courses ---
async function loadCourses() {
    const res = await fetch(`${API_BASE}/api/courses`);
    const data = await res.json();
    coursesTable.innerHTML = "";
    data.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${c.title}</td>
            <td>${c.code}</td>
            <td>
                <button class="delete" onclick="deleteCourse('${c._id}')">Delete</button>
                <button class="register" onclick="registerCourse('${c._id}')">Register</button>
            </td>
        `;
        coursesTable.appendChild(tr);
    });
}

// --- Load Students ---
async function loadStudents() {
    const res = await fetch(`${API_BASE}/api/students`);
    const data = await res.json();
    studentsTable.innerHTML = "";
    studentSelect.innerHTML = `<option value="">--Select a student--</option>`;
    data.forEach(s => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${s.name}</td>
            <td>${s.email || ""}</td>
            <td><button class="delete" onclick="deleteStudent('${s._id}')">Delete</button></td>
        `;
        studentsTable.appendChild(tr);
        const option = document.createElement("option");
        option.value = s._id;
        option.textContent = s.name;
        studentSelect.appendChild(option);
    });
}

// --- Load Student Courses ---
async function loadStudentCourses(studentId, highlightCourseId = null) {
    studentCoursesTable.innerHTML = "";
    if (!studentId) return;
    const res = await fetch(`${API_BASE}/api/students/${studentId}`);
    const student = await res.json();
    student.registeredCourses.forEach(c => {
        const tr = document.createElement("tr");
        const iso = new Date(c.registeredAt).toISOString().slice(0, 16).replace("T", " ");
        tr.innerHTML = `
            <td>${c.title}</td>
            <td>${c.code}</td>
            <td>${iso}</td>
            <td><button class="unregister" onclick="unregisterCourse('${studentId}','${c.courseId}')">Unregister</button></td>
        `;
        if (highlightCourseId && c.courseId === highlightCourseId) {
            tr.style.background = "#d4f7d4";
            setTimeout(() => tr.style.background = "", 1500);
        }
        studentCoursesTable.appendChild(tr);
    });
}

// --- CRUD Actions ---
document.getElementById("add-course-form").addEventListener("submit", async e => {
    e.preventDefault();
    const title = document.getElementById("course-title").value;
    const code = document.getElementById("course-code").value;
    await fetch(`${API_BASE}/api/courses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, code }) });
    e.target.reset();
    loadCourses();
    showToast("Course added!");
});

document.getElementById("add-student-form").addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("student-name").value;
    const email = document.getElementById("student-email").value;
    await fetch(`${API_BASE}/api/students`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) });
    e.target.reset();
    loadStudents();
    showToast("Student added!");
});

async function deleteCourse(id) { if (confirm("Delete course?")) { await fetch(`${API_BASE}/api/courses/${id}`, { method: "DELETE" }); loadCourses(); showToast("Course deleted!", false); } }
async function deleteStudent(id) { if (confirm("Delete student?")) { await fetch(`${API_BASE}/api/students/${id}`, { method: "DELETE" }); loadStudents(); loadStudentCourses(""); showToast("Student deleted!", false); } }
async function registerCourse(courseId) { const studentId = studentSelect.value; if (!studentId) return alert("Select a student"); await fetch(`${API_BASE}/api/students/${studentId}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId }) }); loadStudentCourses(studentId, courseId); showToast("Registered!"); }
async function unregisterCourse(studentId, courseId) { if (confirm("Unregister course?")) { await fetch(`${API_BASE}/api/students/${studentId}/unregister`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId }) }); loadStudentCourses(studentId); showToast("Unregistered!", false); } }

// --- Seed Reset ---
document.getElementById("seed-btn").addEventListener("click", async () => {
    if (confirm("Reset all data?")) { await fetch(`${API_BASE}/api/seed`, { method: "POST" }); loadCourses(); loadStudents(); loadStudentCourses(""); showToast("Seed reset!"); }
});

// --- Student select ---
studentSelect.addEventListener("change", e => loadStudentCourses(e.target.value));

// --- Search ---
document.getElementById("course-search").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    coursesTable.querySelectorAll("tr").forEach(r => r.style.display = r.children[0].textContent.toLowerCase().includes(term) || r.children[1].textContent.toLowerCase().includes(term) ? "" : "none");
});
document.getElementById("student-search").addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    studentsTable.querySelectorAll("tr").forEach(r => r.style.display = r.children[0].textContent.toLowerCase().includes(term) || r.children[1].textContent.toLowerCase().includes(term) ? "" : "none");
});

// --- Initialize ---
loadCourses(); loadStudents();

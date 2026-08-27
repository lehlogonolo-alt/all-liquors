import { useState } from "react";
import { toast } from "sonner";

function AddEmployee({ onEmployeeAdded }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name || !email) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:3000/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email })
      });

      const data = await res.text();

      toast.success(data);

      // reset form
      setName("");
      setEmail("");

      // refresh dashboard automatically
      if (onEmployeeAdded) {
        onEmployeeAdded();
      }

    } catch (err) {
      console.log(err);
      toast.error("Error adding employee ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="add-employee-page">

      <div className="add-employee-card">

        <div className="add-employee-header">
          <h1>Add Employee </h1>

          <p>
            Create a new employee profile to manage attendance,
            working hours, and leave records from the admin dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="add-employee-form">

          <div className="form-group">
            <label>Employee Name</label>

            <input
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Employee Email</label>

            <input
              type="email"
              placeholder="e.g. john@allliquors.co.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="save-employee-btn"
            disabled={loading}
          >
            {loading ? "Adding Employee..." : "Save Employee"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default AddEmployee;
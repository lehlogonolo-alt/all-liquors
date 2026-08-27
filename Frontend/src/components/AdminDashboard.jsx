import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddEmployee from "./AddEmployee";
import { toast } from "sonner";
import {
  FaUsers,
  FaChartBar,
  FaEnvelope,
  FaCheckCircle,
  FaSignOutAlt,
  FaClock,
  FaTrash,
  FaUserShield,
  FaTools,
  FaToggleOn,
  FaToggleOff
} from "react-icons/fa";


function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveList, setLeaveList] = useState([]);
  const [messages, setMessages] = useState([]);

  // WEBSITE MAINTENANCE
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "We are currently carrying out scheduled maintenance. Please check back shortly."
  );
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);

  // 🔥 EMAIL STATES
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sending, setSending] = useState(false);

  // 🔥 EVENTS
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");

  const [editingEmployee, setEditingEmployee] = useState(null);

  const [search, setSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [monthlyTotals, setMonthlyTotals] = useState({});

  const [employeePage, setEmployeePage] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);

  // 🔍 USERS SEARCH + PAGINATION
const [userSearch, setUserSearch] = useState("");
const [userPage, setUserPage] = useState(1);

//messages
const [messageSearch, setMessageSearch] = useState("");

const [messagePage, setMessagePage] = useState(1);

const messagesPerPage = 8;


 const USERS_PER_PAGE = 5;
  const EMP_PER_PAGE = 5;
  const ATT_PER_PAGE = 5;

  const navigate = useNavigate();

  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchLeave();
    fetchMonthlyTotals();
    fetchMessages();
    fetchEvents();
    fetchUsers();
    fetchMaintenanceSettings();
  }, []);

  /* ================= FETCH ================= */

  const fetchEmployees = () => {
    fetch("http://localhost:3000/employees")
      .then(res => res.json())
      .then(setEmployees);
  };

  const fetchAttendance = () => {
    fetch("http://localhost:3000/attendance")
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort(
          (a, b) => new Date(b.ClockIn) - new Date(a.ClockIn)
        );
        setAttendance(sorted);
      });
  };

  const fetchLeave = () => {
    fetch("http://localhost:3000/leave/active")
      .then(res => res.json())
      .then(setLeaveList);
  };

  const fetchMonthlyTotals = () => {
    fetch("http://localhost:3000/attendance/monthly-all")
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.forEach(item => {
          map[item.EmployeeId] = item.TotalHours;
        });
        setMonthlyTotals(map);
      });
  };

  const fetchMessages = () => {
    fetch("http://localhost:3000/messages")
      .then(res => res.json())
      .then(setMessages);
  };

  const fetchEvents = () => {
    fetch("http://localhost:3000/events")
      .then(res => res.json())
      .then(setEvents);
  };



  const fetchMaintenanceSettings = async () => {
    try {
      const response = await fetch("http://localhost:3000/admin/site-settings");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load website settings");
      }

      setMaintenanceMode(Boolean(data.maintenanceMode));
      setMaintenanceMessage(
        data.maintenanceMessage ||
          "We are currently carrying out scheduled maintenance. Please check back shortly."
      );
      setMaintenanceLoaded(true);
    } catch (error) {
      console.error("Maintenance settings error:", error);
      toast.error(error.message || "Could not load maintenance settings");
    }
  };

  const toggleMaintenanceMode = async () => {
    const nextMode = !maintenanceMode;

    if (nextMode) {
      const confirmed = window.confirm(
        "Turn Maintenance Mode ON? Customers will immediately be prevented from using the website while admins remain able to access it."
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        "Turn Maintenance Mode OFF and make the website available to customers again?"
      );
      if (!confirmed) return;
    }

    setMaintenanceSaving(true);

    try {
      const response = await fetch(
        "http://localhost:3000/admin/site-settings/maintenance",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: nextMode,
            message: maintenanceMessage
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update maintenance mode");
      }

      setMaintenanceMode(Boolean(data.maintenanceMode));
      toast.success(data.message);
      window.dispatchEvent(new Event("maintenance-status-changed"));
    } catch (error) {
      console.error("Maintenance update error:", error);
      toast.error(error.message || "Could not update maintenance mode");
    } finally {
      setMaintenanceSaving(false);
    }
  };

  /* ================= ACTIONS ================= */

  const clockIn = async (id) => {
  try {
    const response = await fetch("http://localhost:3000/clockin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        employeeId: id
      })
    });

    const msg = await response.text();

    if (!response.ok) {
      toast.error(msg);
      return;
    }

    toast.success(msg);

    fetchAttendance();
    fetchMonthlyTotals();

  } catch (error) {
    console.log("Clock in error:", error);
    toast.error("Clock in failed ❌");
  }
};

  const clockOut = async (id) => {
  try {
    const response = await fetch("http://localhost:3000/clockout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        employeeId: id
      })
    });

    const msg = await response.text();

    if (!response.ok) {
      toast.error(msg);
      return;
    }

    toast.success(msg);

    fetchAttendance();
    fetchMonthlyTotals();

  } catch (error) {
    console.log("Clock out error:", error);
    toast.error("Clock out failed ❌");
  }
};

  const handleDelete = (id) => {
    if (!window.confirm("Delete this employee?")) return;

    fetch(`http://localhost:3000/employees/${id}`, {
      method: "DELETE"
    }).then(() => {
      fetchEmployees();
      fetchAttendance();
      fetchLeave();
      fetchMonthlyTotals();
    });
  };

  const handleEdit = (emp) => setEditingEmployee(emp);

  const handleUpdate = (e) => {
    e.preventDefault();

    fetch(`http://localhost:3000/employees/${editingEmployee.Id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editingEmployee.Name,
        email: editingEmployee.Email
      })
    }).then(() => {
      setEditingEmployee(null);
      fetchEmployees();
    });
  };

  /* ================= EMAIL ================= */

  const sendEmailCampaign = () => {
    if (!emailSubject || !emailMessage) {
      toast.error("Subject and message are required!");
      return;
    }

    setSending(true);

    fetch("http://localhost:3000/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subject: emailSubject,
        message: emailMessage
      })
    })
      .then(res => res.text())
      .then(msg => {
        toast.success(msg);
        setEmailSubject("");
        setEmailMessage("");
      })
      .catch(() => toast.error("Failed to send email"))
      .finally(() => setSending(false));
  };

  const sendEventEmail = () => {
    if (!selectedEvent) {
      toast.error("Select an event ❌");
      return;
    }

    const event = events.find(e => e.Id == selectedEvent);

    fetch("http://localhost:3000/send-event-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subject: `🎉 ${event.Title}`,
        message: emailMessage,
        event: event
      })
    })
      .then(res => res.text())
      .then(msg => toast.success(msg))
      .catch(() => toast.error("Failed to send event email"));
  };

  // users
  const fetchUsers = () => {
  fetch("http://localhost:3000/users")
    .then(res => res.json())
    .then(setUsers);
};

const makeAdmin = (id) => {
  fetch(`http://localhost:3000/users/${id}/make-admin`, {
    method: "PUT"
  })
    .then(res => res.text())
    .then(msg => {
      toast.success(msg);
      fetchUsers();
    });
};

const removeAdmin = (id) => {
  fetch(`http://localhost:3000/users/${id}/remove-admin`, {
    method: "PUT"
  })
    .then(res => res.text())
    .then(msg => {
      toast.success(msg);
      fetchUsers();
    });
};

async function deleteUser(id) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this user?"
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/users/${id}`,
      {
        method: "DELETE"
      }
    );

    const data = await response.text();

    if (!response.ok) {
      alert(data || "Failed to delete user.");
      return;
    }

    alert("User deleted successfully.");

    // Refresh the users list
    fetchUsers();

  } catch (error) {
    console.error("Delete user error:", error);
    alert("Could not connect to the server.");
  }
}

const deleteMessage = (id) => {
  if (!window.confirm("Delete this message?")) return;

  fetch(`http://localhost:3000/messages/${id}`, {
    method: "DELETE"
  })
    .then(res => res.text())
    .then(msg => {
      toast.success(msg);
      fetchMessages();
    })
    .catch(err => console.log(err));
};

  /* ================= FILTERS ================= */

  const filteredEmployees = employees.filter(emp =>
    emp.Name.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const filteredAttendance = attendance.filter(a => {
    const matchesSearch = (a.Name || "")
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesDate = selectedDate
      ? new Date(a.ClockIn).toISOString().split("T")[0] === selectedDate
      : true;

    return matchesSearch && matchesDate;
  });

  /* ================= TODAY ATTENDANCE STATUS ================= */

const getTodayAttendance = (employeeId) => {
  const today = new Date();

  return attendance.find((record) => {
    if (record.EmployeeId !== employeeId) return false;

    const clockInDate = new Date(record.ClockIn);

    return (
      clockInDate.getFullYear() === today.getFullYear() &&
      clockInDate.getMonth() === today.getMonth() &&
      clockInDate.getDate() === today.getDate()
    );
  });
};

  /* ================= PAGINATION ================= */

  const empStart = (employeePage - 1) * EMP_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(empStart, empStart + EMP_PER_PAGE);

  const attStart = (attendancePage - 1) * ATT_PER_PAGE;
  const paginatedAttendance = filteredAttendance.slice(attStart, attStart + ATT_PER_PAGE);

  const totalEmployeePages = Math.ceil(filteredEmployees.length / EMP_PER_PAGE);
  const totalAttendancePages = Math.ceil(filteredAttendance.length / ATT_PER_PAGE);

  
  
  /* ================= USERS SEARCH + PAGINATION ================= */

const filteredUsers = users.filter(u =>
  u.Email.toLowerCase().includes(userSearch.toLowerCase())
);

const userStart = (userPage - 1) * USERS_PER_PAGE;

const paginatedUsers = filteredUsers.slice(
  userStart,
  userStart + USERS_PER_PAGE
);

const totalUserPages = Math.ceil(
  filteredUsers.length / USERS_PER_PAGE
);

 /* ================= MESSAGES FILTERING and PAGINATION ================= */
const filteredMessages = messages.filter(message =>
  message.Name.toLowerCase().includes(messageSearch.toLowerCase()) ||
  message.Email.toLowerCase().includes(messageSearch.toLowerCase()) ||
  message.Message.toLowerCase().includes(messageSearch.toLowerCase())
);
  
const totalMessagePages = Math.ceil(
  filteredMessages.length / messagesPerPage
);

const startIndex =
  (messagePage - 1) * messagesPerPage;

const currentMessages = filteredMessages.slice(
  startIndex,
  startIndex + messagesPerPage
);
  
  /* ================= UI ================= */
return (
  <div className="admin-dashboard">
    <h1>Admin Dashboard</h1>


    {/* ================= WEBSITE MAINTENANCE ================= */}
    <section className={`dashboard-section maintenance-admin-panel ${maintenanceMode ? "is-active" : ""}`}>
      <div className="maintenance-admin-header">
        <div>
          <p className="maintenance-admin-label">Website Control</p>
          <h2>
            <FaTools className="section-icon" />
            Maintenance Mode
          </h2>
          <p className="maintenance-admin-description">
            Temporarily place the customer website offline while you deploy or test an update.
            Admin access and critical payment confirmations remain available.
          </p>
        </div>

        <div className={`maintenance-status-pill ${maintenanceMode ? "on" : "off"}`}>
          <span className="maintenance-status-dot" />
          {maintenanceLoaded ? (maintenanceMode ? "Maintenance ON" : "Website Live") : "Loading..."}
        </div>
      </div>

      <div className="maintenance-admin-body">
        <div className="maintenance-message-field">
          <label htmlFor="maintenance-message">Customer message</label>
          <textarea
            id="maintenance-message"
            rows="3"
            maxLength="500"
            value={maintenanceMessage}
            disabled={maintenanceSaving}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="Message customers will see while the website is offline"
          />
          <small>{maintenanceMessage.length}/500 characters</small>
        </div>

        <button
          type="button"
          className={`maintenance-toggle-btn ${maintenanceMode ? "turn-off" : "turn-on"}`}
          onClick={toggleMaintenanceMode}
          disabled={!maintenanceLoaded || maintenanceSaving}
        >
          {maintenanceMode ? <FaToggleOff /> : <FaToggleOn />}
          {maintenanceSaving
            ? "Updating..."
            : maintenanceMode
              ? "Turn Maintenance Off"
              : "Turn Maintenance On"}
        </button>
      </div>

      {maintenanceMode && (
        <div className="maintenance-admin-warning">
          Customers are currently seeing the maintenance page. Finish and verify your deployment before turning the website back on.
        </div>
      )}
    </section>

    {/* 👥 EMPLOYEES */}
    <section className="dashboard-section">
    <h2>
      <FaUsers className="section-icon" />
      Employees
    </h2>

  <input
    className="dashboard-input"
    type="text"
    placeholder="Search employee..."
    value={employeeSearch}
    onChange={(e) => {
      setEmployeeSearch(e.target.value);
      setEmployeePage(1);
    }}
  />

  <div className="employee-grid">
    {paginatedEmployees.map(emp => (
      <div key={emp.Id} className="employee-card">
        <h3>{emp.Name}</h3>
        <p>{emp.Email}</p>

        <p className="hours">
          Monthly Hours: <strong>{monthlyTotals[emp.Id] || 0}</strong>
        </p>

        <div className="employee-actions">

  {(() => {
    const todayAttendance = getTodayAttendance(emp.Id);

    const hasClockedIn = !!todayAttendance;
    const hasClockedOut = !!todayAttendance?.ClockOut;

    return (
      <>
        <button
          onClick={() => clockIn(emp.Id)}
          disabled={hasClockedIn}
          title={
            hasClockedIn
              ? "Employee has already clocked in today"
              : "Clock employee in"
          }
        >
          <FaCheckCircle />

          {hasClockedIn
            ? "Clocked In"
            : "Clock In"}
        </button>


        <button
          onClick={() => clockOut(emp.Id)}
          disabled={!hasClockedIn || hasClockedOut}
          title={
            !hasClockedIn
              ? "Employee has not clocked in today"
              : hasClockedOut
              ? "Employee has already clocked out today"
              : "Clock employee out"
          }
        >
          <FaSignOutAlt />

          {hasClockedOut
            ? "Clocked Out"
            : "Clock Out"}
        </button>


        <button
          onClick={() => navigate(`/employee-hours/${emp.Id}`)}
        >
          <FaClock />
          View Hours
        </button>


        <button
          className="danger-btn"
          onClick={() => handleDelete(emp.Id)}
        >
          <FaTrash />
          Delete
        </button>
      </>
    );
  })()}

      </div>
      </div>
    ))}
  </div>

  <div className="pagination">
    <button
      disabled={employeePage === 1}
      onClick={() => setEmployeePage(p => p - 1)}
    >
      Prev
    </button>

    <button
      disabled={employeePage === totalEmployeePages}
      onClick={() => setEmployeePage(p => p + 1)}
    >
      Next
    </button>
  </div>
</section>

    {/* 📊 ATTENDANCE */}
    <section className="dashboard-section">
    <h2>
    <FaChartBar className="section-icon" />
    Attendance Logs
    </h2>

  <div className="filters-row">
    <input
      className="dashboard-input"
      type="text"
      placeholder="Search employee..."
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setAttendancePage(1);
      }}
    />

    <input
      className="dashboard-input"
      type="date"
      value={selectedDate}
      onChange={(e) => {
        setSelectedDate(e.target.value);
        setAttendancePage(1);
      }}
    />
  </div>

  <table className="dashboard-table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Clock In</th>
        <th>Clock Out</th>
        <th>Hours</th>
      </tr>
    </thead>

    <tbody>
      {paginatedAttendance.map(a => (
        <tr key={a.Id}>
          <td>{a.Name}</td>
          <td>{new Date(a.ClockIn).toLocaleString()}</td>
          <td>
            {a.ClockOut
              ? new Date(a.ClockOut).toLocaleString()
              : "Active"}
          </td>
          <td>{a.HoursWorked || "-"}</td>
        </tr>
      ))}
    </tbody>
  </table>

  <div className="pagination">
    <button
      disabled={attendancePage === 1}
      onClick={() => setAttendancePage(p => p - 1)}
    >
      Prev
    </button>

    <button
      disabled={attendancePage === totalAttendancePages}
      onClick={() => setAttendancePage(p => p + 1)}
    >
      Next
    </button>
  </div>
</section>

    

    {/* 📩 MESSAGES */}
   {/* ================= CUSTOMER MESSAGES ================= */}

<section className="dashboard-section">

  <div className="dashboard-header">

    <h2>
    <FaEnvelope className="section-icon" />
    Customer Messages
    </h2> 

    <input
      type="text"
      className="dashboard-search"
      placeholder="Search messages..."
      value={messageSearch}
      onChange={(e) => {
        setMessageSearch(e.target.value);
        setMessagePage(1);
      }}
    />

  </div>

  {currentMessages.length === 0 ? (

    <div className="empty-state">
      <h3>No messages found</h3>
    </div>

  ) : (

    <div className="messages-grid">

      {currentMessages.map(m => (

        <div
          key={m.Id}
          className="message-card"
          >

        <h4>{m.Name}</h4>

        <p className="message-email">
        {m.Email}
        </p>

        <p>{m.Message}</p>

        <button
        className="danger-btn"
        onClick={() => deleteMessage(m.Id)}
        >
        Delete Message
        </button>

      </div>

      ))}

    </div>

  )}

  {totalMessagePages > 1 && (

    <div className="pagination">

      <button
        disabled={messagePage === 1}
        onClick={() =>
          setMessagePage(messagePage - 1)
        }
      >
        ← Previous
      </button>

      {Array.from(
        { length: totalMessagePages },
        (_, i) => (

          <button
            key={i}
            className={
              messagePage === i + 1
                ? "active-page"
                : ""
            }
            onClick={() =>
              setMessagePage(i + 1)
            }
          >
            {i + 1}
          </button>

        )
      )}

      <button
        disabled={messagePage === totalMessagePages}
        onClick={() =>
          setMessagePage(messagePage + 1)
        }
      >
        Next →
      </button>

    </div>

  )}

</section>

   

          {/* 👑 USERS MANAGEMENT */}
      <section className="users-section">
        <h2>
         <FaUserShield className="section-icon" />
          Users & Admins
        </h2>

        <input
  type="text"
  className="dashboard-search"
  placeholder="Search by email..."
  value={userSearch}
  onChange={(e) => {
    setUserSearch(e.target.value);
    setUserPage(1);
  }}
/>

        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: "center" }}>
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map(user => (
                <tr key={user.Id}>
                  <td>{user.Email}</td>

                  <td>
                    {user.IsAdmin ? "Admin" : "User"}
                  </td>

                  <td>

                    {user.IsAdmin ? (
                   <button
                    className="remove-admin-btn"
                    onClick={() => removeAdmin(user.Id)}
                   >
                   Remove Admin
                  </button>
                  ) : (
                  <button
                  className="make-admin-btn"
                  onClick={() => makeAdmin(user.Id)}
                  >
                   Make Admin
                  </button>
                )}

               <button
               className="danger-btn"
               style={{ marginLeft: "10px" }}
               onClick={() => deleteUser(user.Id)}
                >
                Delete
                </button>

                </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 📄 PAGINATION */}
        <div className="pagination">
          <button
            disabled={userPage === 1}
            onClick={() => setUserPage(p => p - 1)}
          >
            ⏮ Prev
          </button>

          <span>
            Page {userPage} of {totalUserPages || 1}
          </span>

          <button
            disabled={userPage === totalUserPages || totalUserPages === 0}
            onClick={() => setUserPage(p => p + 1)}
          >
            Next ⏭
          </button>
        </div>
      </section>
  </div>
);
}

export default AdminDashboard;
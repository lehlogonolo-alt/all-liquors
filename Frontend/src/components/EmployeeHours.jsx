import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaClock,
  FaFileExcel,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";
import * as XLSX from "xlsx";

function EmployeeHours() {
  const { id } = useParams();

  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  /* ============================
          PAGINATION
  ============================ */

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [month, year]);

  function fetchData() {
    fetch(
      `http://localhost:3000/attendance/employee/${id}?month=${month}&year=${year}`
    )
      .then((res) => res.json())
      .then((data) => {
        setRecords(data);
        setCurrentPage(1);
      })
      .catch((err) => {
        console.error("Error loading attendance:", err);
      });
  }

  /* ============================
        TOTAL MONTHLY HOURS
  ============================ */

  const totalHours = records.reduce(
    (sum, r) => sum + (parseFloat(r.HoursWorked) || 0),
    0
  );

  /* ============================
        PAGINATION LOGIC
  ============================ */

  const totalPages = Math.ceil(records.length / recordsPerPage);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;

  const currentRecords = records.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  function goToPage(page) {
    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* ============================
          EXPORT EXCEL
  ============================ */

  function exportExcel() {
    if (records.length === 0) {
      alert("There are no attendance records to export.");
      return;
    }

    const monthName = new Date(
      year,
      Number(month) - 1
    ).toLocaleString("default", {
      month: "long"
    });

    const reportInfo = [
      ["ALL LIQUORS WHOLESALE"],
      ["EMPLOYEE ATTENDANCE REPORT"],
      [],
      ["Employee ID", id],
      ["Report Month", `${monthName} ${year}`],
      ["Total Monthly Hours", totalHours.toFixed(2)],
      []
    ];

    const tableHeaders = [
      "Date",
      "Clock In",
      "Clock Out",
      "Total Hours"
    ];

    const attendanceData = records.map((r) => {
      const clockIn = new Date(r.ClockIn);

      const clockOut = r.ClockOut
        ? new Date(r.ClockOut)
        : null;

      return [
        clockIn.toLocaleDateString(),
        clockIn.toLocaleTimeString(),
        clockOut
          ? clockOut.toLocaleTimeString()
          : "Active",
        r.HoursWorked
          ? Number(r.HoursWorked)
          : ""
      ];
    });

    const totalRow = [
      "",
      "",
      "TOTAL",
      Number(totalHours.toFixed(2))
    ];

    const worksheetData = [
      ...reportInfo,
      tableHeaders,
      ...attendanceData,
      totalRow
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(
      worksheetData
    );

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 }
    ];

    worksheet["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 3 }
      },
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 3 }
      }
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Employee Hours"
    );

    const safeMonth = String(month).padStart(2, "0");

    const fileName =
      `Employee_${id}_Hours_${year}-${safeMonth}.xlsx`;

    XLSX.writeFile(
      workbook,
      fileName
    );
  }

  return (
    <div className="employee-hours-page">

      <div className="employee-hours-card">

        {/* ================= HEADER ================= */}

        <div className="employee-hours-header">

          <div>

            <p className="section-tag">
              Employee Report
            </p>

            <h1>
              <FaClock className="section-icon" />
              Employee Hours
            </h1>

            <p>
              View attendance records, total monthly hours
              and export reports.
            </p>

          </div>

          <button
            className="export-btn"
            onClick={exportExcel}
          >
            <FaFileExcel />
            Export Excel
          </button>

        </div>

        {/* ================= FILTERS ================= */}

        <div className="hours-filters">

          <div className="filter-group">

            <label>
              Month
            </label>

            <input
              type="number"
              min="1"
              max="12"
              value={month}
              onChange={(e) =>
                setMonth(Number(e.target.value))
              }
            />

          </div>

          <div className="filter-group">

            <label>
              Year
            </label>

            <input
              type="number"
              value={year}
              onChange={(e) =>
                setYear(Number(e.target.value))
              }
            />

          </div>

        </div>

        {/* ================= SUMMARY ================= */}

        <div className="hours-summary">

          <div className="summary-card">

            <h3>
              Total Monthly Hours
            </h3>

            <span>
              {totalHours.toFixed(2)}
            </span>

          </div>

        </div>

        {/* ================= TABLE ================= */}

        <div className="hours-table-wrapper">

          <table className="hours-table">

            <thead>

              <tr>

                <th>
                  Date
                </th>

                <th>
                  Clock In
                </th>

                <th>
                  Clock Out
                </th>

                <th>
                  Total Hours
                </th>

              </tr>

            </thead>

            <tbody>

              {records.length === 0 ? (

                <tr>

                  <td
                    colSpan="4"
                    className="no-records"
                  >
                    No attendance records found.
                  </td>

                </tr>

              ) : (

                currentRecords.map((r) => (

                  <tr key={r.Id}>

                    <td>
                      {new Date(
                        r.ClockIn
                      ).toLocaleDateString()}
                    </td>

                    <td>
                      {new Date(
                        r.ClockIn
                      ).toLocaleTimeString()}
                    </td>

                    <td>
                      {r.ClockOut
                        ? new Date(
                            r.ClockOut
                          ).toLocaleTimeString()
                        : "Active"}
                    </td>

                    <td>
                      {r.HoursWorked || "-"}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

        {/* ================= PAGINATION ================= */}

        {totalPages > 1 && (

          <div className="hours-pagination">

            <div className="hours-pagination-info">
              Showing{" "}
              <strong>
                {indexOfFirstRecord + 1}
              </strong>{" "}
              -{" "}
              <strong>
                {Math.min(
                  indexOfLastRecord,
                  records.length
                )}
              </strong>{" "}
              of{" "}
              <strong>
                {records.length}
              </strong>
            </div>

            <div className="hours-pagination-controls">

              <button
                className="hours-page-btn nav-btn"
                disabled={currentPage === 1}
                onClick={() =>
                  goToPage(currentPage - 1)
                }
                aria-label="Previous page"
              >
                <FaChevronLeft />
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((page) => (

                <button
                  key={page}
                  className={`hours-page-btn ${
                    currentPage === page
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    goToPage(page)
                  }
                >
                  {page}
                </button>

              ))}

              <button
                className="hours-page-btn nav-btn"
                disabled={
                  currentPage === totalPages
                }
                onClick={() =>
                  goToPage(currentPage + 1)
                }
                aria-label="Next page"
              >
                <FaChevronRight />
              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

export default EmployeeHours;
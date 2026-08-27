import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaCalendarPlus, FaEdit, FaMapMarkerAlt, FaPen, FaPlus, FaSpinner, FaTicketAlt, FaTrash } from "react-icons/fa";

const blankTicketType = () => ({ name: "", price: "", description: "", websiteTicketLimit: "" });

function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", location: "", eventDate: "", description: "", image: null,
    directTicketingEnabled: true, ticketTypes: [blankTicketType()]
  });

  useEffect(() => { fetchEvents(); }, []);

  function fetchEvents() {
    fetch("http://localhost:3000/events")
      .then((res) => res.json())
      .then(setEvents)
      .catch(() => toast.error("Failed to fetch events"));
  }

  function updateTicketType(index, field, value) {
    setForm((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.map((type, i) => i === index ? { ...type, [field]: value } : type)
    }));
  }

  function addTicketType() {
    setForm((prev) => ({ ...prev, ticketTypes: [...prev.ticketTypes, blankTicketType()] }));
  }

  function removeTicketType(index) {
    setForm((prev) => ({ ...prev, ticketTypes: prev.ticketTypes.filter((_, i) => i !== index) }));
  }

  function resetForm() {
    setForm({ title: "", location: "", eventDate: "", description: "", image: null, directTicketingEnabled: true, ticketTypes: [blankTicketType()] });
    setEditingEvent(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validTypes = form.ticketTypes.filter((type) => type.name.trim());

    if (!form.title || !form.location || !form.eventDate || !form.description) {
      toast.error("Please complete the event details.");
      return;
    }
    if (!editingEvent && !form.image) {
      toast.error("Event image is required.");
      return;
    }
    if (validTypes.length === 0) {
      toast.error("Add at least one ticket category.");
      return;
    }
    if (validTypes.some((type) => Number(type.price) < 0 || Number(type.websiteTicketLimit) < 1)) {
      toast.error("Each ticket category needs a valid price and website allocation.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("location", form.location);
    formData.append("eventDate", form.eventDate);
    formData.append("description", form.description);
    formData.append("directTicketingEnabled", form.directTicketingEnabled);
    formData.append("ticketTypes", JSON.stringify(validTypes));
    if (form.image) formData.append("image", form.image);

    const url = editingEvent ? `http://localhost:3000/events/${editingEvent.Id}` : "http://localhost:3000/events";
    try {
      const res = await fetch(url, { method: editingEvent ? "PUT" : "POST", body: formData });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      toast.success(text);
      resetForm();
      fetchEvents();
    } catch (err) {
      toast.error(err.message || "Unable to save event");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(event) {
    try {
      const res = await fetch(`http://localhost:3000/events/${event.Id}/ticket-availability`);
      const detail = await res.json();
      if (!res.ok) throw new Error(detail.message || "Unable to load event");
      setEditingEvent(event);
      setForm({
        title: event.Title,
        location: event.Location,
        eventDate: event.EventDate ? event.EventDate.slice(0, 16) : "",
        description: event.Description,
        image: null,
        directTicketingEnabled: Boolean(event.DirectTicketingEnabled),
        ticketTypes: detail.ticketTypes?.length
          ? detail.ticketTypes.map((type) => ({ id: type.Id, name: type.Name, price: type.Price, description: type.Description || "", websiteTicketLimit: type.WebsiteTicketLimit }))
          : [blankTicketType()]
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { toast.error(err.message); }
  }

 async function handleDelete(id) {
  if (!window.confirm("Delete this event?")) return;

  try {
    const res = await fetch(
      `http://localhost:3000/events/${id}`,
      {
        method: "DELETE"
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message || "Error deleting event"
      );
    }

    toast.success(
      data.message || "Event deleted successfully."
    );

    fetchEvents();

  } catch (err) {
    toast.error(
      err.message || "Error deleting event"
    );
  }
}

  return (
    <div className="admin-events admin-events-v2">
      <div className="admin-events-heading">
        <div><p className="section-kicker">Events & ticketing</p><h1>Manage Events</h1><p>Create the event once, then control website ticket stock separately for every category.</p></div>
      </div>

      <form onSubmit={handleSubmit} className="event-form event-form-v2">
        <div className="event-form-section-title"><span>1</span><div><h2>Event Details</h2><p>The information customers see on the Events page.</p></div></div>

        <input type="text" placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input type="text" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input type="datetime-local" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
        <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files[0] })} />
        <textarea rows="4" placeholder="Event description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <label className="event-ticketing-toggle">
          <input type="checkbox" checked={form.directTicketingEnabled} onChange={(e) => setForm({ ...form, directTicketingEnabled: e.target.checked })} />
          <span>Sell digital tickets directly on this website</span>
        </label>

        <div className="event-form-section-title ticket-type-section-title"><span>2</span><div><h2>Ticket Categories</h2><p>Set exactly how many tickets the website may sell for each category.</p></div></div>

        <div className="admin-ticket-type-builder">
          {form.ticketTypes.map((type, index) => (
            <div className="admin-ticket-type-row" key={type.id || index}>
              <div className="ticket-type-number"><FaTicketAlt /></div>
              <input placeholder="Category e.g. Early Bird" value={type.name} onChange={(e) => updateTicketType(index, "name", e.target.value)} />
              <input type="number" min="0" step="0.01" placeholder="Price (R)" value={type.price} onChange={(e) => updateTicketType(index, "price", e.target.value)} />
              <input type="number" min="1" placeholder="Website allocation" value={type.websiteTicketLimit} onChange={(e) => updateTicketType(index, "websiteTicketLimit", e.target.value)} />
              <input placeholder="Short description" value={type.description} onChange={(e) => updateTicketType(index, "description", e.target.value)} />
              <button type="button" className="ticket-type-remove" onClick={() => removeTicketType(index)} disabled={form.ticketTypes.length === 1}><FaTrash /></button>
            </div>
          ))}
          <button type="button" className="add-ticket-type-btn" onClick={addTicketType}><FaPlus /> Add Ticket Category</button>
        </div>

        <button type="submit" className="save-event-btn" disabled={loading}>
          {loading ? <><FaSpinner className="spin-icon" /> Saving...</> : editingEvent ? <><FaPen /> Update Event</> : <><FaCalendarPlus /> Create Event</>}
        </button>
        {editingEvent && <button type="button" className="cancel-event-edit-btn" onClick={resetForm}>Cancel Edit</button>}
      </form>

      <div className="admin-events-list-heading"><div><p className="section-kicker">Published</p><h2>All Events</h2></div></div>
      <div className="events-grid admin-events-grid-v2">
        {events.length === 0 ? <p>No events created yet</p> : events.map((event) => (
          <article key={event.Id} className="event-card admin-event-card-v2">
            <img src={event.Image} alt={event.Title} className="event-image" />
            <div className="event-content">
              <h3>{event.Title}</h3>
              <p className="event-detail"><FaMapMarkerAlt className="event-icon" /> {event.Location}</p>
              <p>{new Date(event.EventDate).toLocaleString()}</p>
              <div className="admin-event-ticket-stats">
                <span>Categories <strong>{event.TicketTypeCount || 0}</strong></span>
                <span>Website allocation <strong>{event.WebsiteTicketLimit || 0}</strong></span>
                <span>Sold <strong>{event.WebsiteTicketsSold || 0}</strong></span>
                <span>Remaining <strong>{event.WebsiteTicketsAvailable || 0}</strong></span>
              </div>
              <div className="event-actions"><button className="edit-btn" onClick={() => handleEdit(event)}><FaEdit /> Edit</button><button className="danger-btn" onClick={() => handleDelete(event.Id)}><FaTrash /> Delete</button></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default AdminEvents;

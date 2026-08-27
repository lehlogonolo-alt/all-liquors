import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaMapMarkerAlt, FaSearch, FaTicketAlt } from "react-icons/fa";

function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/events")
      .then((res) => res.json())
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events
      .filter((event) => new Date(event.EventDate) > new Date())
      .filter((event) => !query || `${event.Title} ${event.Location} ${event.Description}`.toLowerCase().includes(query))
      .sort((a, b) => new Date(a.EventDate) - new Date(b.EventDate));
  }, [events, search]);

  return (
    <main className="events-marketplace-page">
      <section className="events-marketplace-hero">
        <div>
          <p className="section-kicker">All Liquors experiences</p>
          <h1>Events worth showing up for.</h1>
          <p>Discover upcoming events, choose your ticket category and pay securely online.</p>
        </div>
        <label className="events-search-box">
          <FaSearch />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..." />
        </label>
      </section>

      <section className="events-marketplace-list">
        <div className="events-list-heading">
          <div>
            <span>Upcoming</span>
            <h2>All Events</h2>
          </div>
          <p>{visibleEvents.length} event{visibleEvents.length === 1 ? "" : "s"}</p>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="events-marketplace-empty">No upcoming events are available right now.</div>
        ) : (
          visibleEvents.map((event) => {
            const soldOut = Number(event.WebsiteTicketsAvailable || 0) <= 0;
            return (
              <article className="event-market-card" key={event.Id}>
                <div className="event-market-image-wrap">
                  <img src={event.Image} alt={event.Title} />
                  {soldOut && <span className="event-market-badge sold-out">Sold Out</span>}
                </div>

                <div className="event-market-content">
                  <div className="event-market-date">
                    <FaCalendarAlt />
                    <span>{new Date(event.EventDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>

                  <h2>{event.Title}</h2>
                  <p className="event-market-description">{event.Description}</p>
                  <p className="event-market-location"><FaMapMarkerAlt /> {event.Location}</p>

                  <div className="event-market-footer">
                    <div className="event-market-price">
                      <FaTicketAlt />
                      <span>
                        {event.MinTicketPrice != null
                          ? `Tickets from R${Number(event.MinTicketPrice).toFixed(2)}`
                          : "Ticket categories available"}
                      </span>
                    </div>

                    <button
                      className="event-market-button"
                      onClick={() => navigate(`/events/${event.Id}/tickets`)}
                    >
                      {soldOut ? "View Tickets" : "Get Tickets"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

export default Events;

import { Link } from "react-router-dom";
import { FaCalendarCheck } from "react-icons/fa";

function EventsPreview() {

    return (


    <section className="events-preview">
  <h2 className="section-title">
  <FaCalendarCheck className="section-icon" />
  Upcoming Events
</h2>

  <p>Join exclusive liquor experiences and tastings</p>

  <Link to="/events">
  <button className="view-events-btn">
    View All Events
  </button>
</Link>
</section>





    );





}

export default EventsPreview;
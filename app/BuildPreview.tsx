/** Visual summaries of the working self-initiated demos, linked from the homepage. */
export function BuildPreview({ kind }: { kind: "service" | "store" | "bookings" }) {
  return <div className={`build-preview build-preview-${kind}`} aria-hidden="true">
    <div className="build-browser"><span /><span /><span /><small>{kind === "service" ? "CEDAR & STONE / HOME SERVICES" : kind === "store" ? "FORM & FIELD / THE COLLECTION" : "DAYBOOK / SAMPLE WEEK"}</small></div>
    {kind === "service" ? <div className="build-service-screen">
      <div className="build-demo-nav"><b>cedar & stone</b><span>Services &nbsp; Request a quote</span></div>
      <div className="build-service-body"><div><small>A LITTLE HELP AROUND THE HOUSE</small><strong>A home that’s<br />ready for <em>living.</em></strong><p>Painting, small repairs,<br />and seasonal maintenance.</p><span className="build-mini-button">Plan your project ↗</span></div><img src="/demos/shared/house.svg" width={900} height={700} alt="" decoding="async" /></div>
      <div className="build-service-bottom"><span>Painting</span><span>Small repairs</span><span>Seasonal care</span></div>
    </div> : kind === "store" ? <div className="build-store-screen">
      <div className="build-demo-nav"><b>form & field</b><span>The collection &nbsp; Bag (0)</span></div>
      <div className="build-store-photo"><img src="/visuals/ceramic-collection.webp" width={1536} height={1024} alt="" loading="lazy" decoding="async" /><div><small>OBJECTS FOR EVERYDAY LIVING</small><strong>Make room<br />for the <em>everyday.</em></strong></div></div>
      <div className="build-store-bottom"><span>Arc vase / $48</span><span>Everyday cup / $24</span><span>Low bowl / $32</span></div>
    </div> : <div className="build-booking-screen">
      <div className="build-demo-nav"><b>daybook</b><span>BOOKING & SCHEDULING</span></div>
      <div className="build-booking-body"><div><small>CUSTOMER VIEW</small><strong>Find your time.</strong><span className="build-field">Consultation <i>⌄</i></span><span className="build-field">Monday <i>⌄</i></span><div className="build-times"><span>09:00</span><span>10:30</span><span>14:00</span><span>15:30</span></div><span className="build-mini-button">Confirm booking →</span></div><div><small>BUSINESS VIEW</small><strong>Your sample week.</strong><div className="build-day"><span>MONDAY</span><b>10:30 / Site visit</b><small>Reschedule &nbsp; Cancel</small></div><div className="build-day"><span>WEDNESDAY</span><b>09:00 / Project review</b><small>Reschedule &nbsp; Cancel</small></div></div></div>
    </div>}
  </div>;
}


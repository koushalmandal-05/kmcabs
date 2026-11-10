/* KM Cabs — fare estimate + callback request */

(function () {
  const CITIES = ["Bokaro", "Ranchi", "Kolkata"];

  const PLACEHOLDERS = {
    Bokaro: {
      pickup: "City Centre, Bokaro",
      drop: "Sector 4 Market, Bokaro",
    },
    Ranchi: {
      pickup: "Main Road, Ranchi",
      drop: "Airport Road, Ranchi",
    },
    Kolkata: {
      pickup: "Park Street, Kolkata",
      drop: "Howrah Station, Kolkata",
    },
  };

  const FARE_ENDINGS = [0.91, 0.93, 0.95, 0.97, 0.99];

  const VEHICLES = {
    cab: [
      { id: "mini", name: "Mini Cab", eta: "5–10 min", base: 65, perKm: 14, seats: "4" },
      { id: "sedan", name: "Sedan", eta: "6–12 min", base: 90, perKm: 17, seats: "4" },
      { id: "suv", name: "SUV", eta: "7–14 min", base: 120, perKm: 21, seats: "6" },
    ],
    rental: [
      { id: "mini-4h", name: "Mini · 4 hrs / 40 km", eta: "Package", base: 999, perKm: 0, seats: "4" },
      { id: "sedan-4h", name: "Sedan · 4 hrs / 40 km", eta: "Package", base: 1299, perKm: 0, seats: "4" },
      { id: "suv-8h", name: "SUV · 8 hrs / 80 km", eta: "Package", base: 2499, perKm: 0, seats: "6" },
      { id: "innova-8h", name: "Innova · 8 hrs / 80 km", eta: "Package", base: 2899, perKm: 0, seats: "7" },
    ],
    outstation: [
      { id: "sedan-os", name: "Sedan Outstation", eta: "One way", base: 1800, perKm: 12, seats: "4" },
      { id: "suv-os", name: "SUV Outstation", eta: "One way", base: 2400, perKm: 15, seats: "6" },
      { id: "innova-os", name: "Innova Outstation", eta: "Round trip", base: 3200, perKm: 16, seats: "7" },
    ],
    goods: [
      { id: "pickup", name: "Mini Pickup", eta: "20–40 min", base: 350, perKm: 18, seats: "Load" },
      { id: "tempo", name: "Tempo", eta: "25–45 min", base: 550, perKm: 22, seats: "Load" },
      { id: "tata407", name: "Tata 407", eta: "30–55 min", base: 900, perKm: 28, seats: "Load" },
    ],
  };

  const SERVICE_LABELS = {
    cab: "City Cab",
    rental: "Rental",
    outstation: "Outstation",
    goods: "Goods Transport",
  };

  const form = document.getElementById("booking-form");
  if (!form) return;

  const citySelect = document.getElementById("city");
  const pickupInput = document.getElementById("pickup");
  const dropInput = document.getElementById("drop");
  const serviceInput = document.getElementById("service-type");
  const errorEl = document.getElementById("booking-error");
  const tabs = document.querySelectorAll(".booking-tab");
  const swapBtn = document.getElementById("swap-route");

  const overlay = document.getElementById("fare-overlay");
  const closeBtn = document.getElementById("close-fare");
  const fareRoute = document.getElementById("fare-route");
  const fareMeta = document.getElementById("fare-meta");
  const vehicleList = document.getElementById("vehicle-list");
  const breakdown = document.getElementById("fare-breakdown");
  const callbackForm = document.getElementById("callback-form");
  const formStatus = document.getElementById("form-status");

  let currentService = "cab";
  let selectedVehicle = null;
  let lastQuote = null;

  function setPlaceholders(city) {
    const p = PLACEHOLDERS[city] || PLACEHOLDERS.Bokaro;
    pickupInput.placeholder = p.pickup;
    dropInput.placeholder = p.drop;
  }

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function estimateDistanceKm(pickup, drop, city, service) {
    const seed = hashString(`${city}|${pickup}|${drop}|${service}`);
    if (service === "rental") return 0;
    if (service === "outstation") return 80 + (seed % 220);
    return 3 + (seed % 28) + (seed % 10) / 10;
  }

  function platformFee(seed) {
    // Keep fee in .75–.99 range with charm endings like .91 / .93 / .99
    return FARE_ENDINGS[(seed || Math.floor(Math.random() * 100)) % FARE_ENDINGS.length];
  }

  function roundMoney(n) {
    return Math.round(n * 100) / 100;
  }

  // Snap raw fare to X99 (199, 299, 1299…) so totals look like 199.99 / 299.91
  function charmWhole(rawAmount) {
    return Math.max(99, Math.ceil((rawAmount + 1) / 100) * 100 - 1);
  }

  function formatINR(n) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  function vehicleIcon(id) {
    const icons = {
      mini: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 14h18l-1.5-5.5A3 3 0 0 0 16.6 6H7.4a3 3 0 0 0-2.9 2.5L3 14Z"/><path d="M5 14v3M19 14v3"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>`,
      sedan: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 14h18v2a1 1 0 0 1-1 1h-1"/><path d="M5 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M5 13 7 7h7l4 6"/></svg>`,
      suv: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 13h18v4H3z"/><path d="M5 13 7 7h8l4 6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
      default: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 17v2M17 17v2M3 12h18"/></svg>`,
    };
    if (id.includes("mini") || id.includes("pickup")) return icons.mini;
    if (id.includes("sedan")) return icons.sedan;
    if (id.includes("suv") || id.includes("innova") || id.includes("tempo") || id.includes("407")) return icons.suv;
    return icons.default;
  }

  function quoteVehicle(vehicle, distanceKm, fee) {
    const rawDistance = vehicle.perKm * distanceKm;
    const rawTotal = vehicle.base + rawDistance;
    const subtotal = charmWhole(rawTotal);
    const distanceCharge =
      vehicle.perKm > 0 ? Math.max(0, subtotal - vehicle.base) : 0;
    const platform = fee;
    const total = roundMoney(subtotal + platform);
    return {
      ...vehicle,
      distanceKm,
      distanceCharge,
      platformFee: platform,
      subtotal,
      total,
    };
  }

  function renderVehicles(quotes) {
    vehicleList.innerHTML = quotes
      .map(
        (q, idx) => `
      <button type="button" class="vehicle-card${idx === 0 ? " selected" : ""}" data-id="${q.id}" aria-pressed="${idx === 0}">
        <div class="vehicle-icon">${vehicleIcon(q.id)}</div>
        <div class="vehicle-info">
          <h3>${q.name}</h3>
          <p>${q.eta} · ${q.seats === "Load" ? "Goods" : q.seats + " seats"}</p>
        </div>
        <div class="vehicle-price">
          <strong>${formatINR(q.total)}</strong>
          <span>incl. platform fee</span>
        </div>
      </button>`
      )
      .join("");

    selectedVehicle = quotes[0];
    renderBreakdown(selectedVehicle);

    vehicleList.querySelectorAll(".vehicle-card").forEach((card) => {
      card.addEventListener("click", () => {
        vehicleList.querySelectorAll(".vehicle-card").forEach((c) => {
          c.classList.remove("selected");
          c.setAttribute("aria-pressed", "false");
        });
        card.classList.add("selected");
        card.setAttribute("aria-pressed", "true");
        selectedVehicle = quotes.find((q) => q.id === card.dataset.id);
        renderBreakdown(selectedVehicle);
      });
    });
  }

  function renderBreakdown(q) {
    if (!q) {
      breakdown.classList.remove("show");
      return;
    }
    const rows = [
      ["Base fare", formatINR(q.base)],
      q.perKm > 0
        ? [
            `Distance (${q.distanceKm.toFixed(1)} km × ₹${q.perKm})`,
            formatINR(q.distanceCharge),
          ]
        : null,
      ["Platform fee", formatINR(q.platformFee)],
      ["Estimated total", formatINR(q.total)],
    ].filter(Boolean);

    breakdown.innerHTML = rows
      .map((row, i) => {
        const isTotal = i === rows.length - 1;
        return `<div class="fare-row${isTotal ? " total" : ""}"><span>${row[0]}</span><span>${row[1]}</span></div>`;
      })
      .join("");
    breakdown.classList.add("show");

    // Keep hidden fields in sync for email
    syncCallbackFields();
  }

  function syncCallbackFields() {
    if (!callbackForm || !lastQuote || !selectedVehicle) return;
    callbackForm.querySelector('[name="city"]').value = lastQuote.city;
    callbackForm.querySelector('[name="service"]').value = SERVICE_LABELS[lastQuote.service];
    callbackForm.querySelector('[name="pickup"]').value = lastQuote.pickup;
    callbackForm.querySelector('[name="drop"]').value = lastQuote.drop;
    callbackForm.querySelector('[name="vehicle"]').value = selectedVehicle.name;
    callbackForm.querySelector('[name="fare"]').value = formatINR(selectedVehicle.total);
    callbackForm.querySelector('[name="platform_fee"]').value = formatINR(
      selectedVehicle.platformFee
    );
    callbackForm.querySelector('[name="_subject"]').value = `KM Cabs callback — ${selectedVehicle.name} (${lastQuote.city})`;
  }

  function openFareSheet(quote) {
    lastQuote = quote;
    fareRoute.textContent = `${quote.pickup} → ${quote.drop}`;
    fareMeta.innerHTML = `
      <span class="meta-pill">${quote.city}</span>
      <span class="meta-pill">${SERVICE_LABELS[quote.service]}</span>
      ${
        quote.distanceKm > 0
          ? `<span class="meta-pill">~${quote.distanceKm.toFixed(1)} km</span>`
          : `<span class="meta-pill">Package fare</span>`
      }
    `;

    const quotes = VEHICLES[quote.service].map((v, i) => {
      const fee = platformFee(Math.floor(Math.random() * 50) + i);
      return quoteVehicle(v, quote.distanceKm, fee);
    });

    renderVehicles(quotes);
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    formStatus.classList.remove("show", "ok", "err");
  }

  function closeFareSheet() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentService = tab.dataset.service;
      serviceInput.value = currentService;
    });
  });

  citySelect.addEventListener("change", () => setPlaceholders(citySelect.value));
  setPlaceholders(citySelect.value || "Bokaro");

  if (swapBtn) {
    swapBtn.addEventListener("click", () => {
      const a = pickupInput.value;
      pickupInput.value = dropInput.value;
      dropInput.value = a;
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.classList.remove("show");

    const city = citySelect.value.trim();
    const pickup = pickupInput.value.trim();
    const drop = dropInput.value.trim();
    const service = serviceInput.value || currentService;

    if (!CITIES.includes(city)) {
      errorEl.textContent = "Services are available only in Bokaro, Ranchi, and Kolkata.";
      errorEl.classList.add("show");
      return;
    }
    if (pickup.length < 3 || drop.length < 3) {
      errorEl.textContent = "Please enter both pickup and destination.";
      errorEl.classList.add("show");
      return;
    }
    if (pickup.toLowerCase() === drop.toLowerCase()) {
      errorEl.textContent = "Pickup and destination must be different.";
      errorEl.classList.add("show");
      return;
    }

    const distanceKm = estimateDistanceKm(pickup, drop, city, service);
    openFareSheet({ city, pickup, drop, service, distanceKm });
  });

  closeBtn.addEventListener("click", closeFareSheet);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeFareSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeFareSheet();
  });

  if (callbackForm) {
    callbackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      syncCallbackFields();
      formStatus.classList.remove("show", "ok", "err");

      const name = callbackForm.querySelector('[name="name"]').value.trim();
      const phone = callbackForm.querySelector('[name="phone"]').value.trim();
      const email = callbackForm.querySelector('[name="email"]').value.trim();

      if (name.length < 2) {
        formStatus.textContent = "Please enter your full name.";
        formStatus.classList.add("show", "err");
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ""))) {
        formStatus.textContent = "Enter a valid 10-digit Indian mobile number.";
        formStatus.classList.add("show", "err");
        return;
      }

      const submitBtn = callbackForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      const endpoint = "https://formsubmit.co/ajax/koushalmandal05@gmail.com";
      const payload = Object.fromEntries(new FormData(callbackForm).entries());
      payload.phone = phone.replace(/\s+/g, "");
      if (!email) delete payload.email;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Request failed");

        formStatus.textContent =
          "Request sent! Our team will call you shortly.";
        formStatus.classList.add("show", "ok");
        callbackForm.reset();
        syncCallbackFields();
      } catch (err) {
        formStatus.textContent =
          "Could not send right now. Please try again or email koushalmandal05@gmail.com.";
        formStatus.classList.add("show", "err");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Request Callback";
      }
    });
  }
})();

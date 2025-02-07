document.addEventListener("DOMContentLoaded", function () {
    function fetchBookings() {
        fetch("/admin/bookings") // Replace with your API endpoint
            .then(response => response.json())
            .then(bookings => {
                renderBookings(bookings);
            })
            .catch(error => console.error("Error fetching bookings:", error));
    }

    function renderBookings(bookings) {
        const bookingContainer = document.getElementById("booking-list-container");
        bookingContainer.innerHTML = ""; 

        bookings.forEach(booking => {
            const bookingCard = document.createElement("div");
            bookingCard.classList.add("booking-card");

            bookingCard.innerHTML = `
                <img src="${booking.room_image}" class="room-image" alt="Room Image">
                <h3>${booking.room_name}</h3>
                <p>Total Price: $${booking.total_price}</p>
                <p>Status: <span class="status ${booking.status.toLowerCase()}">${booking.status}</span></p>
                ${booking.status.toLowerCase() === "cancel" ? `<button class="refund-btn" data-id="${booking.booking_id}">Refund</button>` : ""}
            `;

            bookingContainer.appendChild(bookingCard);
        });

        addRefundButtonListeners();
    }

    function addRefundButtonListeners() {
        document.querySelectorAll(".refund-btn").forEach(button => {
            button.addEventListener("click", function () {
                const bookingId = this.getAttribute("data-id");
                updateBookingStatus(bookingId, "refund");
            });
        });
    }

    function updateBookingStatus(bookingId, newStatus) {
        fetch(`/admin/update-booking/${bookingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            fetchBookings();
        })
        .catch(error => console.error("Error updating booking:", error));
    }

    document.getElementById("status-filter").addEventListener("change", function () {
        const selectedStatus = this.value;
        fetch("/admin/bookings") 
            .then(response => response.json())
            .then(bookings => {
                if (selectedStatus !== "all") {
                    bookings = bookings.filter(booking => booking.status.toLowerCase() === selectedStatus);
                }
                renderBookings(bookings);
            })
            .catch(error => console.error("Error filtering bookings:", error));
    });

    fetchBookings(); // Load bookings on page load
});

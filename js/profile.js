document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM content loaded");
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    console.log("Logged-in user:", user);

    const logoutButton = document.getElementById("logout2");
    console.log("LogoutButton: ", logoutButton);
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            console.log("Logout button clicked!");  // Debugging line
            logoutUser();
        });
    } else {
        console.log("Logout button not found.");
    }

    const userNameElement = document.getElementById("userName");
    userNameElement.textContent = `${user.firstName} ${user.lastName}`;

    if (user && user.id) {
        try {
            const response = await fetch(`/get-bookings?user_id=${user.id}`);
            console.log("API Response:", response);

            if (!response.ok) {
                console.error("API Error:", response.status, response.statusText);
                displayEmptyMessage();
                return;
            }

            const bookings = await response.json();
            console.log("Bookings:", bookings);

            if (bookings.length > 0) {
                displayBookings(bookings);
            } else {
                displayEmptyMessage();
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
            displayEmptyMessage();
        }
    } else {
        console.log("No logged-in user found.");
        displayEmptyMessage();
    }
});

function createOrdersDivIfMissing() {
    let ordersDiv = document.getElementById("orders");
    if (!ordersDiv) {
        ordersDiv = document.createElement("div");
        ordersDiv.id = "orders";
        document.body.appendChild(ordersDiv);  // or append it wherever it's supposed to be
    }
    return ordersDiv;
}

function displayBookings(bookings) {
    const ordersDiv = createOrdersDivIfMissing();
    console.log("Orders Div:", ordersDiv);
    ordersDiv.innerHTML = ""; 
    if (!ordersDiv) {
        console.error("Element with id 'orders' not found");
        return;
    }

    bookings.forEach((booking) => {
        const bookingCard = document.createElement("div");
        bookingCard.classList.add("card", "mb-3");
        bookingCard.style.width = "80%"; // Adjust width as needed
        bookingCard.style.maxWidth = "900px"; // Optional max width
        bookingCard.style.border = "1px solid #ddd";
        bookingCard.style.borderRadius = "10px";


        // Booking card content
        bookingCard.innerHTML = `
            <div class="row g-0">
                <div class="col-md-4">
                    <img src="${booking.room_image}" class="img-fluid rounded-start" alt="${booking.room_name}">
                </div>
                <div class="col-md-5">
                    <div class="card-body">
                        <h5 class="card-title">${booking.room_name}</h5>
                        <p class="card-text">
                            <strong>Check-In:</strong> ${booking.check_in}<br>
                            <strong>Check-Out:</strong> ${booking.check_out}<br>
                            <strong>Total Price:</strong> ${booking.total_price} VND
                        </p>
                    </div>
                </div>
                <div class="col-md-3 d-flex flex-column justify-content-center align-items-end p-3">
                    <p class="card-text">
                        <strong>Status:</strong> ${booking.status}
                    </p>
                    ${
                        booking.status === "success"
                            ? `<button class="btn btn-danger btn-sm" onclick="cancelBooking(${booking.booking_id})">Cancel</button>`
                            : booking.status === "pending"
                            ? `<button class="btn btn-success btn-sm" onclick="payBooking(${booking.booking_id})">Pay</button>`
                            : ""
                    }
                </div>
            </div>
        `;

        ordersDiv.appendChild(bookingCard);
    });
}

function displayEmptyMessage() {
    const ordersDiv = document.querySelector(".orders");
    ordersDiv.innerHTML = `
        <div class="empty">
            <p>No result</p>
            <button onclick="window.location.href='hotel.html'" class="btn btn-primary">Book Now</button>
        </div>
    `;
}

async function cancelBooking(bookingId) {
    try {
        const response = await fetch(`/api/bookings/cancel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ booking_id: bookingId }),
        });

        if (response.ok) {
            alert("Booking canceled successfully!");
            location.reload(); // Reload to update the status
        } else {
            alert("Failed to cancel booking.");
        }
    } catch (error) {
        console.error("Error canceling booking:", error);
    }
}

async function payBooking(bookingId) {
    try {
        const response = await fetch(`/api/vnpay/initiate-payment`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ booking_id: bookingId }),
        });

        if (response.ok) {
            const { paymentUrl } = await response.json();
            window.location.href = paymentUrl; 
        } else {
            alert("Failed to initiate payment.");
        }
    } catch (error) {
        console.error("Error initiating payment:", error);
    }
}


// Toggle dropdown visibility on click (for destination)
document.getElementById("destination-btn").addEventListener("click", function () {
    this.classList.toggle("active");
    const dropdownContent = document.getElementById("destination-options");
    dropdownContent.style.display =
        dropdownContent.style.display === "block" ? "none" : "block";
});

// Handle destination selection
let selectedHotelId = null;
document.querySelectorAll("#destination-options p").forEach((option) => {
    option.addEventListener("click", function () {
        const destinationBtn = document.getElementById("destination-btn");
        destinationBtn.textContent = this.textContent; 
        destinationBtn.classList.remove("active");
        document.getElementById("destination-options").style.display = "none";

        selectedHotelId = this.dataset.hotelId;
        console.log("Selected Hotel ID:", selectedHotelId); 
    });
});

// Fetch hotel names and populate the dropdown
function loadHotels() {
    fetch("http://localhost:3000/api/hotels")
        .then((response) => response.json())
        .then((hotels) => {
            const dropdownContent = document.getElementById("destination-options");
            dropdownContent.innerHTML = ""; 

            hotels.forEach((hotel) => {
                const option = document.createElement("p");
                option.textContent = hotel.name;
                option.dataset.hotelId = hotel.hotel_id;
                dropdownContent.appendChild(option);

                option.addEventListener("click", function () {
                    const destinationBtn = document.getElementById("destination-btn");
                    destinationBtn.textContent = this.textContent;
                    destinationBtn.classList.remove("active");
                    dropdownContent.style.display = "none";

                    selectedHotelId = this.dataset.hotelId;
                    console.log("Selected Hotel ID from dropdown:", selectedHotelId);
                });
            });
        })
        .catch((error) => console.error("Error fetching hotels:", error));
}

// Fetch rooms for the selected hotel
function fetchRooms(hotelId) {
    const url = `http://localhost:3000/api/rooms?hotelId=${hotelId}`;
    fetch(url)
        .then((response) => response.json())
        .then((rooms) => {
            const roomList = document.getElementById("room-list");
            roomList.innerHTML = ""; // Clear previous room data

            if (rooms.length === 0) {
                roomList.innerHTML = "<p>No available rooms for this hotel.</p>";
                return;
            }

            rooms.forEach((room) => {
                const roomCard = document.createElement("div");
                roomCard.className = "room-card";
                roomCard.innerHTML = `
                    <h3>${room.RoomName}</h3>
                    <p>Price per night: ${room.PricePerNight.toLocaleString()} VND</p>
                    <p>Max Occupancy: ${room.MaxOccupancy} people</p>
                    <p>Available Rooms: ${room.AvailableRooms}</p>
                    <button class="book-now-btn" 
                        data-room-id="${room.RoomID}" 
                        data-price-per-night="${room.PricePerNight}">
                        Book Now
                    </button>
                `;
                roomList.appendChild(roomCard);

                roomCard.querySelector(".book-now-btn").addEventListener("click", function () {
                    const roomId = this.dataset.roomId;
                    const pricePerNight = parseFloat(this.dataset.pricePerNight);
                    const checkInDate = document.getElementById("checkin").value;
                    const checkOutDate = document.getElementById("checkout").value;

                    if (!checkInDate || !checkOutDate) {
                        alert("Please select both check-in and check-out dates.");
                        return;
                    }

                    if (checkOutDate <= checkInDate) {
                        alert("Checkout date must be later than the check-in date.");
                        return;
                    }

                    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
                    if (!loggedInUser || !loggedInUser.id) {
                        alert("Please log in before booking.");
                        return;
                    }

                    const loggedInUserId = loggedInUser.id;

                    const numberOfNights = Math.max(
                        Math.ceil(
                            (new Date(checkOutDate) - new Date(checkInDate)) / 
                                (1000 * 60 * 60 * 24)
                        ),
                        1
                    );

                    const totalPrice = numberOfNights * pricePerNight;

                    createBooking(loggedInUserId, roomId, checkInDate, checkOutDate, totalPrice);
                });
            });
        })
        .catch((error) => console.error("Error fetching rooms:", error));
}
// Create a booking
function createBooking(userId, roomId, checkInDate, checkOutDate, totalPrice) {
    const bookingData = {
        userId,
        roomId,
        checkInDate,
        checkOutDate,
        totalPrice,
    };
    fetch("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert("Booking successful!");
            } else {
                alert("Failed to book room. Please try again.");
            }
        })
        .catch((error) => console.error("Error creating booking:", error));
}

// Load hotels on page load
document.addEventListener("DOMContentLoaded", () => {
    loadHotels();
});

// Handle the search button click event
document.querySelector(".search-btn").addEventListener("click", function (e) {
    e.preventDefault();

    console.log("Selected Hotel ID before search:", selectedHotelId);

    if (!selectedHotelId) {
        alert("Please select a hotel.");
    } else {
        fetchRooms(selectedHotelId);
    }
});

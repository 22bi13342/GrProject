document.addEventListener("DOMContentLoaded", function () {
    let allRooms = [];
    let selectedHotelId = null;

    function loadHotels() {
        fetch("/api/hotels")
            .then(response => response.json())
            .then(hotels => {
                const hotelSelect = document.getElementById("hotel-select");
                hotelSelect.innerHTML = `<option value="">All Hotels</option>`;

                hotels.forEach(hotel => {
                    const option = document.createElement("option");
                    option.value = hotel.hotel_id;
                    option.textContent = hotel.name;
                    hotelSelect.appendChild(option);
                });
            })
            .catch(error => console.error("Error fetching hotels:", error));
    }

    function fetchAdminRooms() {
        fetch("/admin/rooms")
            .then(response => response.json())
            .then(rooms => {
                allRooms = rooms;
                filterRooms();
            })
            .catch(error => console.error("Error fetching rooms:", error));
    }

    function filterRooms() {
        const startDateInput = document.getElementById("start-date").value;
        const endDateInput = document.getElementById("end-date").value;
        let startDate = startDateInput ? new Date(startDateInput) : null;
        let endDate = endDateInput ? new Date(endDateInput) : null;

        let filteredRooms = allRooms;

        if (selectedHotelId) {
            filteredRooms = filteredRooms.filter(room => room.HotelID == selectedHotelId);
        }

        if (startDate && endDate && startDate <= endDate) {
            filteredRooms = filteredRooms.filter(room => room.AvailableRooms > 0);
        }

        displayRooms(filteredRooms);
    }

    function displayRooms(rooms) {
        const roomList = document.getElementById("room-list");
        roomList.innerHTML = "";

        if (rooms.length === 0) {
            roomList.innerHTML = "<p>No rooms found.</p>";
            return;
        }

        rooms.forEach(room => {
            const roomCard = document.createElement("div");
            roomCard.className = "room-card";

            // Create carousel HTML structure properly
            let carouselImages = room.Images.map((img, index) => `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img src="${img}" alt="Room Image ${index + 1}">
                </div>
            `).join('');

            roomCard.innerHTML = `
                <div class="room-content">
                    <div class="carousel">
                        <div class="carousel-inner">
                            ${carouselImages}
                        </div>
                        <button class="carousel-prev">&#10094;</button>
                        <button class="carousel-next">&#10095;</button>
                    </div>
                    <div class="room-details">
                        <h3>${room.RoomName} - ${room.HotelName}</h3>
                        <p>Price per night: ${room.PricePerNight.toLocaleString()} VND</p>
                        <p>Max Occupancy: ${room.MaxOccupancy} people</p>
                        <p>Available Rooms: ${room.AvailableRooms}</p>
                        <button class="modify-room" data-room-id="${room.RoomID}">Modify</button>
                        <button class="remove-room" data-room-id="${room.RoomID}">Remove</button>
                    </div>
                </div>
            `;

            roomList.appendChild(roomCard);
            initCarousel(roomCard);

            roomCard.querySelector(".modify-room").addEventListener("click", function () {
                modifyRoom(room.RoomID);
            });

            roomCard.querySelector(".remove-room").addEventListener("click", function () {
                removeRoom(room.RoomID);
            });
        });
    }

    function initCarousel(roomCard) {
        const items = roomCard.querySelectorAll(".carousel-item");
        const prevButton = roomCard.querySelector(".carousel-prev");
        const nextButton = roomCard.querySelector(".carousel-next");
        let currentIndex = 0;

        function updateCarousel() {
            items.forEach((item, index) => {
                item.style.display = index === currentIndex ? "block" : "none";
            });
        }

        prevButton.addEventListener("click", () => {
            currentIndex = (currentIndex === 0) ? items.length - 1 : currentIndex - 1;
            updateCarousel();
        });

        nextButton.addEventListener("click", () => {
            currentIndex = (currentIndex === items.length - 1) ? 0 : currentIndex + 1;
            updateCarousel();
        });

        updateCarousel();
    }

    function modifyRoom(roomId) {
        alert(`Modify room ID: ${roomId}`);
    }

    function removeRoom(roomId) {
        if (confirm("Are you sure you want to delete this room?")) {
            fetch(`/api/admin/delete-room/${roomId}`, { method: "DELETE" })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    fetchAdminRooms();
                })
                .catch(error => console.error("Error deleting room:", error));
        }
    }

    document.getElementById("hotel-select").addEventListener("change", function () {
        selectedHotelId = this.value || null;
        filterRooms();
    });

    document.getElementById("start-date").addEventListener("change", filterRooms);
    document.getElementById("end-date").addEventListener("change", filterRooms);

    loadHotels();
    fetchAdminRooms();
});

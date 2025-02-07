const adminId = '2'; // Admin's ID (hardcoded or dynamically fetched)
const socket = io();

socket.on("connect", () => {
    console.log("Connected to the server!");
});

socket.on("disconnect", () => {
    console.log("Disconnected from the server.");
});

const usersList = document.getElementById('userss');
const messagesDiv = document.getElementById('messages');
const chatHeader = document.getElementById('chat-header');
const adminMessageInput = document.getElementById('adminMessage');
const sendAdminMessageBtn = document.getElementById('sendAdminMessage');

let activeUserId = "";

document.addEventListener('DOMContentLoaded', () => {
    const usersList = document.getElementById('userss'); 
    console.log('usersList:', usersList);

    fetch('/get-users')
        .then((res) => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then((users) => {
            console.log('Fetched users:', users); // Debug log
            
            // Clear existing users
            usersList.innerHTML = '';

            users.forEach((user) => {
                console.log('Fetched users array:', users);
                const li = document.createElement('li');
                li.dataset.userId = user.id;
                li.innerHTML = `
                    <img src="https://via.placeholder.com/40" alt="User">
                    <div class="user-info">
                        <h4>${user.first_name} ${user.last_name}</h4>
                        <p>Click to chat</p>
                    </div>
                    <div class="timestamp"></div>`;
                li.addEventListener('click', () => {
                    activeUserId = user.id;
                    chatHeader.textContent = `Chat with ${user.first_name} ${user.last_name}`;
                    loadMessages(activeUserId); 
                });
                console.log('Appending:', li);
                usersList.appendChild(li);
                console.log('Appended:', usersList.innerHTML);
            });
        })
        .catch((err) => console.error('Error fetching users:', err));
});


// Fetch messages for the active user (admin view)
function loadMessages() {
    fetch(`/get-messages?userId=${activeUserId}&adminId=${adminId}`)
        .then((res) => res.json())
        .then((messages) => {
            console.log("Fetched messages:", messages);
            messagesDiv.innerHTML = ''; // Clear previous messages
            messages.forEach((msg) => {
                const div = document.createElement('div');
                div.className = `message ${msg.senderType === 'admin' ? 'sent' : 'received'}`;
                div.textContent = msg.message;
                messagesDiv.appendChild(div);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom
        })
        .catch((err) => console.error('Error fetching messages:', err));
}

// Socket event for receiving messages
socket.on('receiveMessage', (data) => {
    console.log('Received message:', data);

    // Ensure the message is meant for the active user
    if (data.senderId === activeUserId || data.receiverId === activeUserId) {
        const div = document.createElement('div');
        div.className = `message ${data.senderType === 'admin' ? 'sent' : 'received'}`;
        div.textContent = data.message;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom
    }
});

// Sending message from admin
sendAdminMessageBtn.addEventListener('click', () => {
    if (activeUserId && adminMessageInput.value.trim()) {
        const messageData = {
            senderId: adminId,
            receiverId: activeUserId,
            message: adminMessageInput.value.trim(),
            senderType: 'admin',  // Explicitly mark as admin message
        };

        // Emit message to the server
        socket.emit('sendMessage', messageData);

        // Scroll to the bottom of the chat
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Clear the input box
        adminMessageInput.value = '';
    }
});


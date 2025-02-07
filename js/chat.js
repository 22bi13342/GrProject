// Toggle chat window
document.getElementById('chat-icon').addEventListener('click', () => {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
    } else {
        chatWindow.style.display = 'none';
    }
});
document.addEventListener('click', (event) => {
    const chatWindow = document.getElementById('chat-window');
    const chatIcon = document.getElementById('chat-icon');

    if (
        chatWindow.style.display === 'flex' &&
        !chatWindow.contains(event.target) &&
        !chatIcon.contains(event.target)
    ) {
        chatWindow.style.display = 'none';
    }
});

const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
var socket = io('http://localhost:3000/');

socket.on("connect", () => {
    console.log("Connected to the server!");
});

socket.on("disconnect", () => {
    console.log("Disconnected from the server.");
});

const chatMessages = document.getElementById('chat-messages');
const userMessageBox = document.getElementById('userMessageBox');
const sendUserMessageBtn = document.getElementById('sendUserMessage');

// Get userId and adminId from the logged-in user
const userId = loggedInUser.id;
const adminId = '2';  // Update with actual adminId if dynamic

// Send a message
sendUserMessageBtn.addEventListener('click', () => {
    if (userMessageBox.value.trim()) {
        const messageData = {
            senderId: userId,
            receiverId: adminId,
            message: userMessageBox.value.trim(),
            senderType: 'user',  
        };

        // Emit message to the server
        socket.emit('sendMessage', messageData);

        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Clear the input box
        userMessageBox.value = '';
    }
});

// Receive messages
socket.on('receiveMessage', (data) => {
    // Only show the message if it is meant for this user or admin
    if (data.receiverId === userId || data.senderId === userId) {
        const div = document.createElement('div');
        div.className = `message ${data.senderId === userId ? 'sent' : 'received'}`;
        div.textContent = data.message;
        chatMessages.appendChild(div);

        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// Fetch and display messages
function loadChatMessages() {
    fetch(`/get-messages?userId=${userId}&adminId=${adminId}`)
        .then((res) => res.json())
        .then((messages) => {
            console.log("Fetched messages:", messages);

            // Clear existing messages
            chatMessages.innerHTML = '';

            // Append each message to the chat
            messages.forEach((msg) => {
                const div = document.createElement('div');
                div.className = `message ${msg.senderId === userId ? 'sent' : 'received'}`;
                div.textContent = msg.message;
                chatMessages.appendChild(div);
            });

            // Scroll to the bottom of the chat
            chatMessages.scrollTop = chatMessages.scrollHeight;
        })
        .catch((err) => console.error('Error fetching messages:', err));
}

// Load messages on page load
window.addEventListener('load', loadChatMessages);

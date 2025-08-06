document.addEventListener("DOMContentLoaded", () => {
    // Proteger la ruta: si no hay usuario, volver al inicio
    const username = localStorage.getItem("chat-username");
    if (!username) {
        window.location.href = "/index.html";
        return;
    }

    const messagesContainer = document.getElementById("messages");
    const messageForm = document.getElementById("message-form");
    const messageInput = document.getElementById("message-input");
    const imageInput = document.getElementById("image-input");
    const onlineUsersList = document.getElementById("online-users");
    const chatTitle = document.getElementById("chat-title");
    const publicChatBtn = document.getElementById("public-chat-btn");
    const logoutBtn = document.getElementById("logout-btn");
    
    let partySocket;
    let currentRoom = "public";

    function connectToRoom(room) {
        if (partySocket) {
            partySocket.close();
        }

        const host = window.location.host;
        partySocket = new Party.PartySocket({
            host,
            room,
            query: { user: username },
        });

        // Limpiar el chat anterior
        messagesContainer.innerHTML = '';
        chatTitle.textContent = room === 'public' ? 'Chat Público' : `Chat con ${room.split('_').find(u => u !== username)}`;

        partySocket.onmessage = handleSocketMessage;
    }

    function handleSocketMessage(event) {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'system':
                displaySystemMessage(data.message);
                break;
            case 'user_list':
                updateOnlineUsers(data.users);
                break;
            case 'text':
                displayMessage(data, data.user);
                break;
            case 'image':
                displayImage(data, data.user);
                break;
        }
    }
    
    // Conectar a la sala pública por defecto
    connectToRoom(currentRoom);

    function displayMessage({ text }, sender) {
        const div = document.createElement("div");
        div.classList.add("message-bubble", sender === username ? "sent" : "received");
        div.innerHTML = `<div class="sender">${sender}</div><p>${text}</p>`;
        messagesContainer.prepend(div); // Usamos prepend para que los nuevos mensajes aparezcan arriba y el scroll los muestre
    }
    
    function displayImage({ url }, sender) {
        const div = document.createElement("div");
        div.classList.add("message-bubble", sender === username ? "sent" : "received");
        div.innerHTML = `<div class="sender">${sender}</div><img src="${url}" alt="Imagen enviada por ${sender}" />`;
        messagesContainer.prepend(div);
    }
    
    function displaySystemMessage(message) {
        const div = document.createElement("div");
        div.className = "system-message";
        div.textContent = message;
        messagesContainer.prepend(div);
    }

    function updateOnlineUsers(users) {
        onlineUsersList.innerHTML = '';
        users.forEach(user => {
            if (user === username) return; // No mostrar nuestro propio nombre
            const li = document.createElement('li');
            li.textContent = user;
            li.dataset.user = user;
            onlineUsersList.appendChild(li);
        });
    }

    messageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = messageInput.value;
        if (text && partySocket) {
            partySocket.send(JSON.stringify({ type: "text", text: text }));
            messageInput.value = "";
        }
    });

    imageInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const blob = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'content-type': file.type || 'application/octet-stream' },
              body: file,
            }).then(res => res.json());

            if (blob.url && partySocket) {
                partySocket.send(JSON.stringify({ type: 'image', url: blob.url }));
            }
        } catch (error) {
            console.error('Error al subir imagen:', error);
            displaySystemMessage("Error al enviar la imagen.");
        }
    });

    // Cambiar a chat privado
    onlineUsersList.addEventListener('click', (e) => {
        if(e.target.tagName === 'LI') {
            const otherUser = e.target.dataset.user;
            // Crear un ID de sala único y consistente
            const roomName = [username, otherUser].sort().join('_');
            currentRoom = roomName;
            connectToRoom(currentRoom);
        }
    });

    publicChatBtn.addEventListener('click', () => {
        currentRoom = 'public';
        connectToRoom(currentRoom);
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('chat-username');
        localStorage.removeItem('chat-userid');
        if (partySocket) partySocket.close();
        window.location.href = '/index.html';
    });
});
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Typography, Button } from '@mui/material';

function App() {
    const [message, setMessage] = useState('');

    useEffect(() => {
        axios.get('http://localhost:5000/test-db')
            .then(response => {
                setMessage(response.data.message);
            })
            .catch(error => {
                setMessage('Error conectando con el backend');
                console.error(error);
            });
    }, []);

    return (
        <Container>
            <Typography variant="h4">Hola, Santiago!</Typography>
            <Typography variant="body1">Estado de la Base de Datos: {message}</Typography>
            <Button variant="contained" color="primary">Botón de prueba</Button>
        </Container>
    );
}

export default App;


import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

export default function TestModal() {
    const [show, setShow] = useState(true);
    const phoneNumber = "1234567890";
    const billingParty = "TEST PARTY";

    if (!show) return null;

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2147483647
        }}>
            <div style={{
                background: 'red',
                padding: '50px',
                borderRadius: '20px',
                border: '15px solid yellow'
            }}>
                <h1 style={{ color: 'yellow', fontSize: '60px' }}>🚨 TEST 🚨</h1>
                <button onClick={() => setShow(false)} style={{
                    padding: '20px 40px',
                    fontSize: '30px',
                    background: 'yellow',
                    border: 'none',
                    borderRadius: '10px',
                    marginTop: '20px'
                }}>
                    CLOSE
                </button>
            </div>
        </div>,
        document.body
    );
}

import React from 'react';

const CharacterDisplay = ({ text }: { text: string }) => (
    <>
        {text.split('').map((char, i) => (
            <span key={i} className="digit">{char}</span>
        ))}
    </>
);

const TimeDisplay = ({ seconds, showSign = false, isDelta = false }: { seconds: number, showSign?: boolean, isDelta?: boolean }) => {
    const absSeconds = Math.abs(seconds);
    const signChar = isDelta && seconds === 0 ? null : (seconds < 0 ? '−' : (showSign ? '+' : null));

    let leftValue, rightValue;

    if (!isDelta && absSeconds >= 3600) {
        leftValue = Math.floor(absSeconds / 3600);
        rightValue = Math.floor((absSeconds % 3600) / 60);
    } else {
        leftValue = Math.floor(absSeconds / 60);
        rightValue = absSeconds % 60;
    }

    return (
        <div className={`timer-display-wrapper-outer ${isDelta ? 'delta' : ''}`}>
            <div className="timer-display-container">
                <span className="timer-sign" style={{ visibility: signChar ? 'visible' : 'hidden' }}>
                    {signChar || '+'}
                </span>
                <div className="timer-value">
                    <CharacterDisplay text={leftValue.toString().padStart(2, '0')} />
                </div>
                <span className="timer-separator">:</span>
                <div className="timer-value">
                    <CharacterDisplay text={rightValue.toString().padStart(2, '0')} />
                </div>
                <span className="timer-sign" style={{ visibility: 'hidden' }}>
                    +
                </span>
            </div>
        </div>
    );
};

export default TimeDisplay;
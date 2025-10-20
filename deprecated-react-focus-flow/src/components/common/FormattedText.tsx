import React from 'react';

// Regex to capture **bold**, *italic*, and \n characters for formatting.
// This captures content inside the markers and the newline character itself.
const formatRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|\n)/g;

interface FormattedTextProps {
    text: string;
}

/**
 * A component that takes a string and formats it into React elements.
 * Supports **bold**, *italic*, and \n for newlines.
 * This approach is safer than using dangerouslySetInnerHTML.
 */
const FormattedText: React.FC<FormattedTextProps> = ({ text }) => {
    if (!text) {
        return null;
    }

    // Split the string by the regex, keeping the delimiters.
    // The filter(Boolean) removes any empty strings from the result.
    const parts = text.split(formatRegex).filter(Boolean);

    return (
        <>
            {parts.map((part, index) => {
                // Check for **bold** format
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index}>{part.slice(2, -2)}</strong>;
                }
                // Check for *italic* format
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={index}>{part.slice(1, -1)}</em>;
                }
                // Check for newline character
                if (part === '\n') {
                    return <br key={index} />;
                }
                // Otherwise, return the text part as is
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </>
    );
};

export default FormattedText;

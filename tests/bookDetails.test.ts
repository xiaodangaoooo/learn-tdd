import { Response } from 'express';
import Book from '../models/book';
import BookInstance from '../models/bookinstance';
import { showBookDtls } from '../pages/book_details';

describe('showBookDtls', () => {
    let res: Partial<Response>;
    const mockBook = {
        title: 'Mock Book Title',
        author: { name: 'Mock Author' }
    };
    const mockCopies = [
        { imprint: 'First Edition', status: 'Available' },
        { imprint: 'Second Edition', status: 'Checked Out' }
    ];

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return book details when the book and copies exist', async () => {
        // Mocking the Book model's findOne and populate methods
        const mockFindOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockBook)
        });
        Book.findOne = mockFindOne;

        // Mocking the BookInstance model's find and select methods
        const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockCopies)
        });
        BookInstance.find = mockFind;

        // Act
        await showBookDtls(res as Response, '12345');

        // Assert
        expect(mockFindOne).toHaveBeenCalledWith({ _id: '12345' });
        expect(mockFindOne().populate).toHaveBeenCalledWith('author');
        expect(mockFind).toHaveBeenCalledWith({ book: '12345' });
        expect(mockFind().select).toHaveBeenCalledWith('imprint status');

        expect(res.send).toHaveBeenCalledWith({
            title: mockBook.title,
            author: mockBook.author.name,
            copies: mockCopies
        });
    });

    it('should return 404 if book is not found', async () => {
        // Mocking the Book model to return null
        const mockFindOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(null)
        });
        Book.findOne = mockFindOne;

        // Mock BookInstance to return some copies (though they won't be used)
        const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockCopies)
        });
        BookInstance.find = mockFind;

        // Act
        await showBookDtls(res as Response, '12345');

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith('Book 12345 not found');
    });

    it('should return 404 if book instance is null', async () => {
        // Mock Book to return a book
        const mockFindOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockBook)
        });
        Book.findOne = mockFindOne;

        // Mock BookInstance to return null
        const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(null)
        });
        BookInstance.find = mockFind;

        // Act
        await showBookDtls(res as Response, '12345');

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith('Book details not found for book 12345');
    });

    it('should return 500 if there is an error fetching the book', async () => {
        // Mocking the Book model's findOne method to throw an error
        Book.findOne = jest.fn().mockImplementation(() => {
            throw new Error('Database error');
        });

        // Act
        await showBookDtls(res as Response, '12345');

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Error fetching book 12345');
    });

    it('should return 500 if there is an error fetching book instance', async () => {
        // Mock Book to return successfully
        const mockFindOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockBook)
        });
        Book.findOne = mockFindOne;

        // Mock BookInstance to throw error
        BookInstance.find = jest.fn().mockImplementation(() => {
            throw new Error('Database error');
        });

        // Act
        await showBookDtls(res as Response, '12345');

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Error fetching book 12345');
    });

    it('should return null if id is not a string', async () => {
        // Act
        await showBookDtls(res as Response, null as any);

        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith('Book null not found');
    });
});
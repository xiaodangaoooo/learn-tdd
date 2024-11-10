import { Response } from 'express';
import Author from '../models/author';
import { getAuthorList, showAllAuthors } from '../pages/authors';

describe('getAuthorList', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.resetAllMocks();
        consoleErrorSpy.mockRestore();
    });

    it('should fetch and format the authors list correctly', async () => {
        // Define the sorted authors list as we expect it to be returned by the database
        const sortedAuthors = [
            {
                first_name: 'Jane',
                family_name: 'Austen',
                date_of_birth: new Date('1775-12-16'),
                date_of_death: new Date('1817-07-18')
            },
            {
                first_name: 'Amitav',
                family_name: 'Ghosh',
                date_of_birth: new Date('1835-11-30'),
                date_of_death: new Date('1910-04-21')
            }
        ];

        // Mock the find method to chain with sort
        const mockFind = jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(sortedAuthors)
        });

        // Apply the mock directly to the Author model's `find` function
        Author.find = mockFind;

        // Act: Call the function to get the authors list
        const result = await getAuthorList();
        // Assert: Check if the result matches the expected sorted output
        const expectedAuthors = [
            'Austen, Jane : 1775 - 1817',
            'Ghosh, Amitav : 1835 - 1910'
        ];
        expect(result).toEqual(expectedAuthors);
        expect(mockFind().sort).toHaveBeenCalledWith([['family_name', 'ascending']]);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should format fullname as empty string if first name is absent', async () => {
        // Define the sorted authors list as we expect it to be returned by the database
        const sortedAuthors = [
            {
                first_name: '',
                family_name: 'Austen',
                date_of_birth: new Date('1775-12-16'),
                date_of_death: new Date('1817-07-18')
            }
        ];
        // Mock the find method to chain with sort
        const mockFind = jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(sortedAuthors)
        });

        // Apply the mock directly to the Author model's `find` function
        Author.find = mockFind;

        // Act: Call the function to get the authors list
        const result = await getAuthorList();

        // Assert: Check if the result matches the expected sorted output
        const expectedAuthors = [
            ' : 1775 - 1817'
        ];
        expect(result).toEqual(expectedAuthors);

        // Verify that `.sort()` was called with the correct parameters
        expect(mockFind().sort).toHaveBeenCalledWith([['family_name', 'ascending']]);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array and log error when database query fails', async () => {
        const testError = new Error('Database error');
        // Arrange: Mock the Author.find() method to throw an error
        Author.find = jest.fn().mockImplementation(() => {
            throw testError;
        });
        // Act: Call the function to get the authors list
        const result = await getAuthorList();
        // Assert: Verify the result is an empty array
        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error fetching authors:',
            testError
        );
    });
});

describe('showAllAuthors', () => {
    let res: Partial<Response>;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        res = {
            send: jest.fn(),
        };
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.resetAllMocks();
        consoleErrorSpy.mockRestore();
    });

    it('should send author list when authors exist', async () => {
        const mockAuthors = [
            'Austen, Jane : 1775 - 1817',
            'Ghosh, Amitav : 1835 - 1910'
        ];

        const mockFind = jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([
                {
                    first_name: 'Jane',
                    family_name: 'Austen',
                    date_of_birth: new Date('1775-12-16'),
                    date_of_death: new Date('1817-07-18')
                },
                {
                    first_name: 'Amitav',
                    family_name: 'Ghosh',
                    date_of_birth: new Date('1835-11-30'),
                    date_of_death: new Date('1910-04-21')
                }
            ])
        });
        Author.find = mockFind;

        await showAllAuthors(res as Response);

        expect(res.send).toHaveBeenCalledWith(expect.arrayContaining(mockAuthors));
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should send "No authors found" when database returns empty list', async () => {
        const mockFind = jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([])
        });
        Author.find = mockFind;

        await showAllAuthors(res as Response);

        expect(res.send).toHaveBeenCalledWith('No authors found');
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should send "No authors found" and log error when database query fails', async () => {
        const testError = new Error('Database error');
        Author.find = jest.fn().mockImplementation(() => {
            throw testError;
        });

        await showAllAuthors(res as Response);

        expect(res.send).toHaveBeenCalledWith('No authors found');
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error fetching authors:',
            testError
        );
    });

    it('should send "No authors found" and log error when getAuthorList fails', async () => {
        jest.spyOn(Author, 'find').mockImplementation(() => {
            throw new Error('Database error');
        });

        await showAllAuthors(res as Response);

        expect(res.send).toHaveBeenCalledWith('No authors found');
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should send "No authors found" and log error when request processing fails', async () => {
        const testError = new Error('Processing error');
        const mockSend = jest.fn()
            .mockImplementationOnce(() => { throw testError; })
            .mockImplementation(() => {}); 
        
        res.send = mockSend;

        const mockFind = jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([
                {
                    first_name: 'Jane',
                    family_name: 'Austen',
                    date_of_birth: new Date('1775-12-16'),
                    date_of_death: new Date('1817-07-18')
                }
            ])
        });
        Author.find = mockFind;

        await showAllAuthors(res as Response);

        expect(mockSend).toHaveBeenCalledTimes(2);
        expect(mockSend).toHaveBeenLastCalledWith('No authors found');
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error processing request:',
            testError
        );
    });
});
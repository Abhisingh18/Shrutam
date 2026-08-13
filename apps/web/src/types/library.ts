export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  total_copies: number;
  available_copies: number;
  category: string | null;
}

export interface BookListResponse {
  data: Book[];
  meta: { page: number; page_size: number; total: number };
}

export interface BookCreateInput {
  title: string;
  author: string;
  isbn?: string | null;
  total_copies: number;
  category?: string | null;
}

export type BookUpdateInput = Partial<BookCreateInput> & { available_copies?: number };

export interface BookIssue {
  id: string;
  book_id: string;
  student_id: string;
  issued_date: string;
  due_date: string;
  returned_date: string | null;
  status: "issued" | "returned" | "overdue";
}

export interface BookIssueListResponse {
  data: BookIssue[];
  meta: { page: number; page_size: number; total: number };
}

export interface BookIssueCreateInput {
  book_id: string;
  student_id: string;
  due_date: string;
}

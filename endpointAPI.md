Shared (all roles)
 Login — /login
POST /login
 My Profile (view + edit) — /profile
GET /profile, PUT /profile
 403 / 404 page — frontend only
Employee
 Dashboard — /employee
GET /employee/dashboard
 My Travel Requests (list; filter by status, search, year) — /employee/requests
GET /employee/requests
 New Travel Request (trip details, cost estimates, documents; save as draft or submit) — /employee/requests/new
GET /employee/requests/create (form options), POST /employee/requests
 Travel Request Detail (costs, documents, approval history, disbursements; cancel button) — /employee/requests/:id
GET /employee/requests/{id}, DELETE /employee/requests/{id} (cancel)
 Edit Travel Request (reuses the new-request form; only while draft or submitted) — /employee/requests/:id/edit
GET /employee/requests/{id}/edit, PUT /employee/requests/{id}
 Expense Report / LPJ (add expenses with receipts, remove, submit to finance; shows advance paid) — /employee/requests/:id/expenses
GET /employee/requests/{id}/expenses, POST /employee/requests/{id}/expenses
DELETE /employee/requests/{id}/expenses/{expense}
Supervisor
 Dashboard — /supervisor
GET /supervisor/dashboard
 Approval Queue — /supervisor/approvals
GET /supervisor/approvals
 Approval Detail (approve, or reject with a note) — /supervisor/approvals/:id
GET /supervisor/approvals/{id}
POST /supervisor/approvals/{id}/approve, POST /supervisor/approvals/{id}/reject
Finance
 Dashboard — /finance
GET /finance/dashboard
 Verification Queue (two tabs: Budget check / Expense reports) — /finance/approvals
GET /finance/approvals?stage=finance|expense_report
 Verification Detail — /finance/approvals/:id
GET /finance/approvals/{id}
POST /finance/approvals/{id}/verify, POST /finance/approvals/{id}/reject
Budget-check stage: show the budget_check box + "approved advance" field
Expense-report stage: per-expense approved amount + note
Verifying an expense report fails while the advance is still unpaid — show that error clearly
 Budgets (list + totals summary; "Allocate budget" form as a modal) — /finance/budgets
GET /finance/budgets, GET /finance/budgets/create, POST /finance/budgets
 Disbursements (advances, reimbursements, refunds; "Mark as paid" modal: method, reference no., date, notes) — /finance/disbursements
GET /finance/disbursements, POST /finance/disbursements/{id}/pay
 Finance Reports (filter by year / month / department, charts, export PDF & Excel) — /finance/reports
GET /finance/reports?format=json|pdf|xlsx
Department filter options: reuse GET /finance/budgets/create
Super Admin
 Dashboard — /admin
GET /admin/dashboard
 Users (list, filters, delete; detail as a modal) — /admin/users
GET /admin/users, GET /admin/users/{id}, DELETE /admin/users/{id}
 Create / Edit User — /admin/users/new, /admin/users/:id/edit
GET /admin/users/create or GET /admin/users/{id}/edit (form options)
POST /admin/users, PUT /admin/users/{id}
 Departments (list; create / edit in a modal — no detail endpoint) — /admin/departments
GET, POST /admin/departments, PUT, DELETE /admin/departments/{id}
 Audit Logs — /admin/audit-logs
GET /admin/audit-logs

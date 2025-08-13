import requests
import sys
from datetime import datetime, timedelta
import json

class FinanceTrackerAPITester:
    def __init__(self, base_url="https://moneyflow-29.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        self.test_user_name = "Test User"
        self.test_user_password = "testpass123"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": self.test_user_email,
                "name": self.test_user_name,
                "password": self.test_user_password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "users/me",
            200
        )
        return success

    def test_user_search(self):
        """Test user search functionality"""
        success, response = self.run_test(
            "Search User (Non-existent)",
            "GET",
            "users/search",
            200,
            data={"email": "nonexistent@example.com"}
        )
        return success

    def test_create_personal_expense(self):
        """Test creating a personal expense"""
        expense_data = {
            "amount": 50.75,
            "date": datetime.now().isoformat(),
            "category": "Supermarket",
            "type": "personal",
            "description": "Weekly groceries"
        }
        success, response = self.run_test(
            "Create Personal Expense",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        if success and 'id' in response:
            return response['id']
        return None

    def test_create_shared_expense(self):
        """Test creating a shared expense"""
        expense_data = {
            "amount": 120.00,
            "date": datetime.now().isoformat(),
            "category": "Utilities",
            "type": "shared",
            "description": "Electricity bill",
            "shared_with": []  # Empty for now since we only have one user
        }
        success, response = self.run_test(
            "Create Shared Expense",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        if success and 'id' in response:
            return response['id']
        return None

    def test_get_expenses(self):
        """Test getting user expenses"""
        success, response = self.run_test(
            "Get User Expenses",
            "GET",
            "expenses",
            200
        )
        return success

    def test_get_expense_by_id(self, expense_id):
        """Test getting a specific expense"""
        success, response = self.run_test(
            "Get Expense by ID",
            "GET",
            f"expenses/{expense_id}",
            200
        )
        return success

    def test_update_expense(self, expense_id):
        """Test updating an expense"""
        update_data = {
            "amount": 75.50,
            "date": datetime.now().isoformat(),
            "category": "Supermarket",
            "type": "personal",
            "description": "Updated groceries expense"
        }
        success, response = self.run_test(
            "Update Expense",
            "PUT",
            f"expenses/{expense_id}",
            200,
            data=update_data
        )
        return success

    def test_dashboard_stats(self):
        """Test getting dashboard statistics"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        return success

    def test_create_shared_group(self):
        """Test creating a shared group"""
        group_data = {
            "name": "Test Group",
            "member_emails": ["nonexistent@example.com"]  # Will be ignored since user doesn't exist
        }
        success, response = self.run_test(
            "Create Shared Group",
            "POST",
            "shared-groups",
            200,
            data=group_data
        )
        return success

    def test_get_shared_groups(self):
        """Test getting user's shared groups"""
        success, response = self.run_test(
            "Get Shared Groups",
            "GET",
            "shared-groups",
            200
        )
        return success

    def test_delete_expense(self, expense_id):
        """Test deleting an expense"""
        success, response = self.run_test(
            "Delete Expense",
            "DELETE",
            f"expenses/{expense_id}",
            200
        )
        return success

def main():
    print("🚀 Starting Finance Tracker API Tests")
    print("=" * 50)
    
    tester = FinanceTrackerAPITester()
    
    # Test user registration
    if not tester.test_user_registration():
        print("❌ Registration failed, stopping tests")
        return 1

    # Test user info retrieval
    if not tester.test_get_current_user():
        print("❌ Get current user failed")

    # Test user search
    if not tester.test_user_search():
        print("❌ User search failed")

    # Test expense creation
    personal_expense_id = tester.test_create_personal_expense()
    if not personal_expense_id:
        print("❌ Personal expense creation failed")

    shared_expense_id = tester.test_create_shared_expense()
    if not shared_expense_id:
        print("❌ Shared expense creation failed")

    # Test expense retrieval
    if not tester.test_get_expenses():
        print("❌ Get expenses failed")

    # Test specific expense retrieval
    if personal_expense_id and not tester.test_get_expense_by_id(personal_expense_id):
        print("❌ Get expense by ID failed")

    # Test expense update
    if personal_expense_id and not tester.test_update_expense(personal_expense_id):
        print("❌ Update expense failed")

    # Test dashboard stats
    if not tester.test_dashboard_stats():
        print("❌ Dashboard stats failed")

    # Test shared groups
    if not tester.test_create_shared_group():
        print("❌ Create shared group failed")

    if not tester.test_get_shared_groups():
        print("❌ Get shared groups failed")

    # Test expense deletion (do this last)
    if personal_expense_id and not tester.test_delete_expense(personal_expense_id):
        print("❌ Delete expense failed")

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
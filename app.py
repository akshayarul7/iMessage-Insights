import streamlit as st
import sqlite3
import os
import re
import json
from datetime import datetime, timedelta

# --- 1. MINIMALIST UI STYLING ---
st.set_page_config(page_title="Message Fetcher", layout="centered")
st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    footer {visibility: hidden;}
    
    .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
        max-width: 700px;
    }
    
    .chat-row {
        margin-bottom: 12px;
        line-height: 1.5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .timestamp {
        font-size: 0.8rem;
        color: #888;
        margin-right: 8px;
    }
    .sender-you {
        font-weight: 600;
        color: #007AFF;
    }
    .sender-them {
        font-weight: 600;
        color: #8E8E93;
    }
    .message-text {
        color: #d1d1d1;
    }
    </style>
""", unsafe_allow_html=True)

# --- CONTACTS HELPER FUNCTIONS ---
CONTACTS_FILE = 'contacts.json'

def load_contacts():
    if os.path.exists(CONTACTS_FILE):
        with open(CONTACTS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_contact(name, number):
    contacts = load_contacts()
    
    # 1. Prevent duplicate names (case-insensitive)
    if name.strip().lower() in [k.lower() for k in contacts.keys()]:
        return False, f"The name '{name}' is already in your Address Book."
        
    # 2. Prevent duplicate numbers/emails
    if '@' in number:
        clean_new = number.lower().strip()
        for k, v in contacts.items():
            if v.lower().strip() == clean_new:
                return False, f"This email is already saved under '{k}'."
    else:
        clean_new = re.sub(r'\D', '', number)
        for k, v in contacts.items():
            if '@' not in v and re.sub(r'\D', '', v) == clean_new:
                return False, f"This phone number is already saved under '{k}'."
                
    contacts[name.strip()] = number.strip()
    with open(CONTACTS_FILE, 'w') as f:
        json.dump(contacts, f)
    return True, "Saved!"

# --- PHONE FORMATTER CALLBACK ---
def format_phone():
    val = st.session_state.new_num_input
    if not val:
        return
        
    # Skip formatting if they are typing an email
    if '@' in val:
        return
        
    # Strip absolutely everything except numbers
    digits = re.sub(r'\D', '', val)
    
    # Format Standard US 10-digit
    if len(digits) == 10:
        st.session_state.new_num_input = f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    # Format US 11-digit (with country code)
    elif len(digits) == 11 and digits.startswith('1'):
        st.session_state.new_num_input = f"1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    else:
        # If it's a weird length, just leave the strict numbers so they can't sneak in letters
        st.session_state.new_num_input = digits

# --- 2. SESSION STATE & MEMORY ---
if "date_picker" not in st.session_state:
    st.session_state.date_picker = (
        (datetime.today() - timedelta(days=30)).date(),
        datetime.today().date()
    )

if "last_search" not in st.session_state:
    st.session_state.last_search = ""

if "new_name_input" not in st.session_state:
    st.session_state.new_name_input = ""
    
if "new_num_input" not in st.session_state:
    st.session_state.new_num_input = ""

# --- 3. APP HEADER ---
st.title("💬 iMessage Archive")
st.write("Search your local Messages database.")

# --- 4. CONTACTS UI (Always Visible) ---
with st.expander("📖 Address Book (Add New Contact)"):
    c1, c2, c3 = st.columns([2, 2, 1])
    with c1:
        st.text_input("Name", key="new_name_input")
    with c2:
        # The on_change callback triggers the auto-formatter the moment they click away or hit Enter
        st.text_input("Phone/Email", key="new_num_input", placeholder="(555) 123-4567", on_change=format_phone)
    with c3:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("Save", use_container_width=True):
            name_val = st.session_state.new_name_input
            num_val = st.session_state.new_num_input
            
            if name_val and num_val:
                success, msg = save_contact(name_val, num_val)
                if success:
                    st.success(msg)
                    # Clear the form inputs after successful save
                    st.session_state.new_name_input = ""
                    st.session_state.new_num_input = ""
                    st.rerun()
                else:
                    st.error(msg)
            else:
                st.error("Fill both fields.")

contacts = load_contacts()
contact_options = ["Select a contact..."] + list(contacts.keys())

# The single entry point to the rest of the app
selected_contact = st.selectbox("Who do you want to look up?", contact_options)

# --- 5. HIDDEN UI (Only shows when a contact is selected) ---
if selected_contact != "Select a contact...":
    search_term = contacts[selected_contact]
    clean_search = re.sub(r'[\s\-\(\)]', '', search_term)
    
    st.caption(f"Linked Number/Email: {search_term}")
    st.divider()

    start_date = datetime(2010, 1, 1).date()
    end_date = datetime.today().date()

    # --- DYNAMIC CALENDAR BOUNDARIES ---
    # We query the DB *every time* to ensure the end date is completely accurate
    try:
        conn = sqlite3.connect('chat.db')
        
        find_chat_query = f"""
        SELECT c.ROWID 
        FROM chat c 
        JOIN chat_handle_join chj ON c.ROWID = chj.chat_id 
        JOIN handle h ON chj.handle_id = h.ROWID 
        WHERE h.id LIKE '%{clean_search}%' 
        AND (SELECT COUNT(*) FROM chat_handle_join WHERE chat_id = c.ROWID) = 1
        ORDER BY (SELECT COUNT(*) FROM chat_message_join WHERE chat_id = c.ROWID) DESC 
        LIMIT 1
        """
        cursor = conn.execute(find_chat_query)
        result = cursor.fetchone()
        
        if result:
            chat_id = result[0]
            
            bounds_query = f"""
            SELECT MIN(m.date), MAX(m.date) 
            FROM message m
            JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
            WHERE cmj.chat_id = {chat_id} AND m.date > 0
            """
            b_cursor = conn.execute(bounds_query)
            bounds = b_cursor.fetchone()
            
            if bounds and bounds[0] and bounds[1]:
                min_d, max_d = bounds
                
                min_sec = min_d / 1000000000 if min_d > 100000000000 else min_d
                max_sec = max_d / 1000000000 if max_d > 100000000000 else max_d
                
                start_date = datetime.fromtimestamp(min_sec + 978307200).date()
                end_date = datetime.fromtimestamp(max_sec + 978307200).date()
                
                if start_date > end_date:
                    start_date = end_date
                    
        conn.close()
    except Exception:
        pass
        
    # If the contact changed, instantly snap the calendar selection to cover their entire timeline
    if clean_search != st.session_state.last_search:
        st.session_state.date_picker = (start_date, end_date)
        st.session_state.last_search = clean_search

    # Layout for Controls
    col1, col2 = st.columns([1, 1])

    with col1:
        # Date input is now firmly locked by the live database query results!
        date_range = st.date_input(
            "Select Date Range", 
            key="date_picker",
            min_value=start_date,
            max_value=end_date
        )
        
        display_all = st.checkbox("Display ALL messages in date range")

    with col2:
        sort_order = st.radio(
            "Which messages do you want?",
            options=["First Few (Oldest)", "Most Recent (Newest)"],
            horizontal=True
        )
        
        msg_count = st.number_input("Number of messages (if not all)", min_value=1, max_value=100000, value=15, disabled=display_all)

    # --- FETCH LOGIC ---
    if st.button(f"Fetch Messages for {selected_contact}", type="primary"):
        if len(date_range) != 2:
            st.warning("Please select both a start and end date in the calendar.")
        else:
            try:
                conn = sqlite3.connect('chat.db')
                
                start_str = date_range[0].strftime('%Y-%m-%d 00:00:00')
                end_str = date_range[1].strftime('%Y-%m-%d 23:59:59')
                
                sql_date_filter = f"datetime((m.date/1000000000)+978307200, 'unixepoch', 'localtime') BETWEEN '{start_str}' AND '{end_str}'"
                
                find_chat_query = f"""
                SELECT c.ROWID 
                FROM chat c 
                JOIN chat_handle_join chj ON c.ROWID = chj.chat_id 
                JOIN handle h ON chj.handle_id = h.ROWID 
                WHERE h.id LIKE '%{clean_search}%' 
                AND (SELECT COUNT(*) FROM chat_handle_join WHERE chat_id = c.ROWID) = 1
                ORDER BY (SELECT COUNT(*) FROM chat_message_join WHERE chat_id = c.ROWID) DESC 
                LIMIT 1
                """
                
                cursor = conn.execute(find_chat_query)
                result = cursor.fetchone()
                
                if not result:
                    st.error(f"Could not find any 1-on-1 chats matching the number for {selected_contact}.")
                else:
                    chat_id = result[0]
                    
                    stats_query = f"""
                    SELECT m.is_from_me, COUNT(*) 
                    FROM chat_message_join cmj 
                    JOIN message m ON cmj.message_id = m.ROWID 
                    WHERE cmj.chat_id = {chat_id} AND {sql_date_filter}
                    GROUP BY m.is_from_me
                    """
                    
                    you_count = 0
                    them_count = 0
                    
                    for is_from_me, count in conn.execute(stats_query):
                        if is_from_me == 1:
                            you_count = count
                        else:
                            them_count = count
                            
                    total_count = you_count + them_count
                    
                    metric_col1, metric_col2, metric_col3 = st.columns(3)
                    metric_col1.metric("Total in Date Range", total_count)
                    metric_col2.metric("Sent by You", you_count)
                    metric_col3.metric("Sent by Them", them_count)
                    
                    st.divider()
                    
                    if total_count > 5000 and display_all:
                        st.info("Loading a massive amount of messages! It might take a few seconds to stitch them together...")
                    
                    order_dir = "ASC" if "First" in sort_order else "DESC"
                    limit_clause = "" if display_all else f"LIMIT {msg_count}"
                    
                    q = f'''
                    SELECT 
                        datetime((m.date/1000000000)+978307200, 'unixepoch', 'localtime') AS time, 
                        CASE WHEN m.is_from_me = 1 THEN 'You' ELSE 'Them' END AS sender, 
                        m.text, 
                        m.attributedBody 
                    FROM chat_message_join cmj 
                    JOIN message m ON m.ROWID = cmj.message_id 
                    WHERE cmj.chat_id = {chat_id} AND {sql_date_filter}
                    ORDER BY m.date {order_dir} 
                    {limit_clause}
                    '''
                    
                    messages = []
                    for time, sender, text, body in conn.execute(q):
                        if text:
                            msg = text
                        elif body:
                            raw = body.decode('utf-8', 'ignore')
                            apple_junk = [
                                'streamtyped', 'NSAttributedString', 'NSMutableString', 'NSString', 'NSDictionary', 
                                'NSObject', 'NSMutableDictionary', 'NSNumber', 'NSArray', 'NSMutableArray', 
                                'NSMutableAttributedString', 'NSColor', '__kIMMessagePartAttributeName', 'NSValue', 
                                '__kIMFileTransferGUIDAttributeName', '__kIMBaseWritingDirectionAttributeName', 
                                '__kIMBreadcrumbTextOptionFlags', '__kIMBreadcrumbTextMarkerAttributeName'
                            ]
                            for w in apple_junk:
                                raw = raw.replace(w, '')
                            
                            msg = ''.join(c if c.isprintable() else ' ' for c in raw)
                            msg = re.sub(r'at_\d_[A-F0-9\-]{36}', '', msg)
                            msg = msg.strip()
                            
                            if 'Started Sharing Location' in msg:
                                msg = 'Started Sharing Location'
                            else:
                                msg = re.sub(r'^@\s*\+[ \!"#$%&\'()*+,\-./:;<=>?@\[\\\]^_`{|}~]*', '', msg)
                                if ' iI ' in msg:
                                    msg = msg.split(' iI ')[0]
                                    
                            msg = msg.replace('\ufffd', '').replace('\ufffc', '')
                            msg = re.sub(r' {2,}', ' ', msg).strip()
                            
                        else:
                            msg = ''
                            
                        if not msg or msg in ['*', 'q']:
                            msg = '[Attachment/Image/Tapback]'
                            
                        messages.append((time, sender, msg))
                    
                    if order_dir == "DESC":
                        messages.reverse()
                    
                    all_html = ""
                    for time, sender, msg in messages:
                        display_sender = selected_contact if sender == "Them" else "You"
                        sender_class = "sender-you" if sender == "You" else "sender-them"
                        
                        all_html += f"""
                        <div class="chat-row">
                            <span class="timestamp">{time}</span> 
                            <span class="{sender_class}">{display_sender}:</span> 
                            <span class="message-text">{msg}</span>
                        </div>
                        """
                    
                    st.markdown(all_html, unsafe_allow_html=True)
                        
            except sqlite3.OperationalError:
                st.error("Database access error. Make sure 'chat.db' is located in the exact same folder as 'app.py'.")